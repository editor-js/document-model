import { make } from '@editorjs/dom';
import type {
  BlockId,
  CoreConfigValidated,
  EditorAPI,
  EditorjsPlugin,
  EditorjsPluginParams,
  EventBus
} from '@editorjs/sdk';
import { UiComponentType } from '@editorjs/sdk';
import type { PopoverItemParams } from '@editorjs/ui-kit';
import { PopoverDesktop, PopoverEvent, PopoverItemType } from '@editorjs/ui-kit';
import { messages } from '../messages.js';
import {
  BlockSettingsClosedUIEvent,
  BlockSettingsOpenedUIEvent,
  BlockSettingsRenderedUIEvent
} from './events/index.js';
import type { BlockSettingsOpenUIEvent } from './events/index.js';

/**
 * Items a provider contributes to the block settings menu.
 *
 * A single item or a list of them, in the vocabulary `@editorjs/ui-kit` popovers already use:
 * an item's behaviour comes entirely from its own params (`onActivate`, `isActive`,
 * `isDisabled`, `closeOnActivate`, `children`, or a `confirmation` whose handler runs on the
 * second activation), so the menu itself interprets nothing.
 */
export type MenuConfig = PopoverItemParams | PopoverItemParams[];

/**
 * The block a provider is being asked about
 */
export interface BlockSettingsContext {
  /**
   * Id of the block the menu is being built for.
   *
   * Identifies the block for as long as it exists, which is why an item's handler should
   * resolve the block's current position from it rather than reusing {@link blockIndex}
   */
  blockId: BlockId;

  /**
   * Position the block held at the moment the menu was built.
   *
   * Only valid then: the document may change while the menu is open, so a handler acting on
   * this number can hit a different block than the user opened the menu on
   */
  blockIndex: number;

  /**
   * Name of the tool rendering the block, for providers that only apply to some tools
   */
  tool: string;
}

/**
 * A function asked for its menu items each time block settings open.
 *
 * Returning `undefined` or an empty list opts out for that block, contributing neither items
 * nor a separator.
 */
export type BlockSettingsProvider = (
  context: BlockSettingsContext
) => MenuConfig | undefined | Promise<MenuConfig | undefined>;

/**
 * Options a provider is registered with
 */
export interface BlockSettingsRegisterOptions {
  /**
   * Ascending sort key for this provider's contribution. Defaults to `0`, ties are broken by
   * registration order. The built-in settings sit last, at `1000`
   */
  order?: number;
}

/**
 * Public API the Block settings plugin exposes as `api.plugins['block-settings']`
 */
export interface BlockSettingsAPI {
  /**
   * Registers a settings provider
   * @param provider - called with the target block each time the menu opens
   * @param options - registration options, `order` among them
   * @returns a function that unregisters the provider
   */
  register(provider: BlockSettingsProvider, options?: BlockSettingsRegisterOptions): () => void;

  /**
   * Closes the menu if it is open
   */
  close(): void;
}

declare module '@editorjs/sdk' {
  /* eslint-disable jsdoc/require-jsdoc -- interface members are documented on the types they alias */
  interface EditorjsPluginApiMap {
    /**
     * Block settings plugin's public API
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention -- the key is the plugin's `name`, which is kebab-case
    'block-settings': BlockSettingsAPI;
  }
  /* eslint-enable jsdoc/require-jsdoc */
}

/**
 * A registered provider together with what it was registered with
 */
interface Registration {
  /** The provider itself */
  provider: BlockSettingsProvider;
  /** Sort key */
  order: number;
  /** Registration counter, used to keep equal orders in registration sequence */
  sequence: number;
}

/**
 * UI plugin that renders the per-block settings menu.
 *
 * Mirrors {@link ToolboxUI}: it announces its element once so `ToolbarUI` can mount it, then
 * builds and opens the menu whenever it receives `ui:block-settings:open`. It owns no items of
 * its own -- everything in the menu comes from registered providers, the built-in Move/Delete
 * entries included.
 */
export class BlockSettingsUI implements EditorjsPlugin<'block-settings'> {
  /**
   * Plugin type
   */
  public static readonly type = UiComponentType.BlockSettings;

  /**
   * Plugin name -- keys `api.plugins['block-settings']`
   */
  public static readonly name = 'block-settings';

  /**
   * API registering providers and closing the menu
   */
  public readonly publicApi: BlockSettingsAPI;

  /**
   * EditorAPI instance, used to resolve the target block
   */
  #api: EditorAPI;

  /**
   * EventBus instance to exchange events between components
   */
  #eventBus: EventBus;

  /**
   * Editor configuration
   */
  #editorConfig: CoreConfigValidated;

  /**
   * Stable element handed to `ToolbarUI`. The popover inside it is replaced per open,
   * so this is what stays mounted
   */
  #holder: HTMLElement;

  /**
   * Popover rendering the current menu, absent until the menu is first built
   */
  #popover: PopoverDesktop | undefined;

  /**
   * Registered providers
   */
  readonly #registrations = new Set<Registration>();

  /**
   * Incremented per registration so providers sharing an `order` keep their registration sequence
   */
  #sequence = 0;

  /**
   * Incremented on every open request. Building a menu is asynchronous, so a request that
   * finishes after a newer one started has been superseded and must not render
   */
  #openToken = 0;

  /**
   * BlockSettingsUI class constructor
   * @param params - Plugin parameters
   */
  constructor({ api, eventBus, config }: EditorjsPluginParams) {
    this.#api = api;
    this.#eventBus = eventBus;
    this.#editorConfig = config;

    this.publicApi = {
      register: (provider, options) => this.#register(provider, options),
      close: () => this.#close(),
    };

    this.#holder = make('div');

    this.#eventBus.dispatchEvent(new BlockSettingsRenderedUIEvent({
      blockSettings: this.#holder,
    }));

    this.#eventBus.addEventListener('ui:block-settings:open', (event: BlockSettingsOpenUIEvent) => {
      void this.#open(event.detail.index);
    });
  }

  /**
   * Cleanup when plugin is destroyed
   */
  public destroy(): void {
    this.#popover?.destroy();
    this.#popover = undefined;
    this.#holder.remove();
  }

  /**
   * Registers a provider and returns its unregister function
   * @param provider - called with the target block each time the menu opens
   * @param options - registration options
   */
  #register(provider: BlockSettingsProvider, options?: BlockSettingsRegisterOptions): () => void {
    const registration: Registration = {
      provider,
      order: options?.order ?? 0,
      sequence: this.#sequence++,
    };

    this.#registrations.add(registration);

    return () => {
      this.#registrations.delete(registration);
    };
  }

  /**
   * Closes the menu if it is open. `hide()` emits the popover's own closed event,
   * which is what dispatches `ui:block-settings:closed`
   */
  #close(): void {
    if (this.#popover?.isShown === true) {
      this.#popover.hide();
    }
  }

  /**
   * Builds the menu for a block and opens it, unless there is nothing to show
   * @param index - position the opening request named
   */
  async #open(index: number): Promise<void> {
    const token = ++this.#openToken;
    const blockId = this.#api.blocks.getIdByIndex(index);

    /**
     * Nothing is selected, or the index is stale. Providers are not asked about a block that
     * is not there. Any menu still on screen was built for a different block, so leaving it
     * open would show one block's settings while claiming to be another's
     */
    if (blockId === undefined) {
      this.#close();

      return;
    }

    const items = await this.#collectItems({
      blockId,
      blockIndex: index,
      tool: this.#api.document.data.blocks[index]?.name ?? '',
    });

    /**
     * A newer request started while this one was waiting on its providers. That one owns the
     * menu now, and rendering this result would replace it with a stale block's items
     */
    if (token !== this.#openToken) {
      return;
    }

    /**
     * Every provider opted out of this block. Same reasoning as the missing block above: the
     * menu does not open, and whatever was open closes rather than misrepresenting this block
     */
    if (items.length === 0) {
      this.#close();

      return;
    }

    this.#renderPopover(items);

    this.#popover?.show();

    this.#eventBus.dispatchEvent(new BlockSettingsOpenedUIEvent({ blockId }));
  }

  /**
   * Asks every registered provider for its items and concatenates the contributions,
   * separated from one another
   * @param context - the block being asked about
   */
  async #collectItems(context: BlockSettingsContext): Promise<PopoverItemParams[]> {
    const ordered = [...this.#registrations].sort(
      (a, b) => (a.order - b.order) || (a.sequence - b.sequence)
    );

    const contributions = await Promise.all(
      ordered.map(async ({ provider }) => {
        try {
          const result = await provider(context);

          if (result === undefined) {
            return [];
          }

          return Array.isArray(result) ? result : [result];
        } catch (error) {
          /**
           * Providers are third-party code, and this is the one place all of it runs. Without
           * isolation a single plugin throwing takes the whole menu down for every block --
           * including the entries of the plugins that did nothing wrong. It contributes
           * nothing instead, and the stack identifies which one it was.
           */
          console.error('[BlockSettingsUI] A block settings provider failed and was skipped', error);

          return [];
        }
      })
    );

    return contributions
      .filter(contribution => contribution.length > 0)
      .reduce<PopoverItemParams[]>((items, contribution) => {
        if (items.length > 0) {
          items.push({ type: PopoverItemType.Separator });
        }

        return items.concat(contribution);
      }, []);
  }

  /**
   * Replaces the popover inside the holder with one built for the given items.
   *
   * The menu is rebuilt rather than edited in place: `removeItemByName` is the only removal
   * `@editorjs/ui-kit` offers, and a separator is constructed without params, so it has no name
   * to be removed by. Handing a fresh popover the complete item list is what guarantees that
   * the items of the previous block leave the accessibility tree.
   * @param items - items the menu should consist of
   */
  #renderPopover(items: PopoverItemParams[]): void {
    this.#popover?.destroy();

    /**
     * The item wrapper is left at ui-kit's default. `wrapperTag: 'button'` -- which the port
     * from PR #157 carried over -- is what ui-kit uses for its *inline* popover, where items
     * are horizontal toolbar buttons and shrink-to-fit is the right width. A vertical menu's
     * styles assume a block-level wrapper, and a form control does not stretch to its
     * container the way a div does, so each row ended up as wide as its own label: the hover
     * highlight covered part of the row, and the UA button font replaced the editor's.
     * Items are still exposed as `menuitem` and activated from the keyboard by ui-kit itself.
     */
    this.#popover = new PopoverDesktop({
      scopeElement: this.#editorConfig.holder,
      searchable: false,
      items,

      /**
       * Names the menu for assistive technologies, matching the button that opens it
       */
      messages: {
        label: messages.blockSettingsMenu,
      },
    });

    this.#popover.on(PopoverEvent.Closed, () => {
      this.#eventBus.dispatchEvent(new BlockSettingsClosedUIEvent({}));
    });

    this.#holder.innerHTML = '';
    this.#holder.appendChild(this.#popover.getElement());
  }
}

export * from './events/index.js';
