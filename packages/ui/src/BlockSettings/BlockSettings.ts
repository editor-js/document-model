import { make } from '@editorjs/dom';
import { IconMenuSmall } from '@codexteam/icons';
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
import ControlStyle from '../controls.module.pcss';
import type { BlockSelectedUIEvent } from '../Blocks/events/index.js';
import {
  BlockSettingsClosedUIEvent,
  BlockSettingsOpenedUIEvent,
  BlockSettingsRenderedUIEvent
} from './events/index.js';
import type { BlockSettingsOpenUIEvent } from './events/index.js';

/**
 * Items a provider contributes to the block settings menu.
 *
 * A single item or a list of them, in the vocabulary `@editorjs/ui-kit` popovers already use.
 * Named apart from `@editorjs/sdk`'s `MenuConfig`, which is a different, narrower shape for
 * inline tools' toolbar config:
 * an item's behaviour comes entirely from its own params (`onActivate`, `isActive`,
 * `isDisabled`, `closeOnActivate`, `children`, or a `confirmation` whose handler runs on the
 * second activation), so the menu itself interprets nothing.
 */
export type BlockSettingsMenuConfig = PopoverItemParams | PopoverItemParams[];

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
) => BlockSettingsMenuConfig | undefined | Promise<BlockSettingsMenuConfig | undefined>;

/**
 * Options a provider is registered with
 */
export interface BlockSettingsRegisterOptions {
  /**
   * Ascending sort key for this provider's contribution, defaulting to `0` with ties broken by
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
 * UI plugin that renders the per-block settings menu and the button that opens it, announcing
 * both once for a host to mount. It owns no items of its own -- everything in the menu comes
 * from registered providers, the built-in Move/Delete entries included.
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
   * Stable element handed to the host. The popover inside it is replaced per open,
   * so this is what stays mounted
   */
  #holder: HTMLElement;

  /**
   * The control that opens the menu. Owned here rather than by the toolbar: the button and
   * the menu are one widget, and every piece of its menu-button contract -- the accessible
   * name, `aria-haspopup`, the `aria-expanded` that has to track the menu's real state --
   * depends on state only this plugin has
   */
  #button: HTMLButtonElement;

  /**
   * Position of the block the menu will be built for, as last reported by block selection.
   *
   * Frozen while the menu is open: the menu belongs to one block, and re-targeting under it
   * would leave the button and the open menu pointing at different blocks
   */
  #selectedBlockIndex = -1;

  /**
   * Popover rendering the current menu, absent until the menu is first built
   */
  #popover: PopoverDesktop | undefined;

  /**
   * Whether the menu is open, as this plugin understands it.
   *
   * Tracked here rather than read back off the popover, whose own shown state is its business
   * and does not reliably survive the click that opened the menu. This is the state the
   * button's `aria-expanded` and the `opened`/`closed` events promise
   */
  #isOpen = false;

  /**
   * Whether the menu was open when the pointer went down on the button.
   *
   * The popover closes itself from the click that follows, and it gets there before this
   * button's own handler -- so by `click` the menu is already gone and a toggle reading the
   * state then would see every second click as a fresh open. `mousedown` is the last moment
   * the answer is still true
   */
  #wasOpenOnPointerDown = false;

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
    this.#button = make('button', ControlStyle['toolbar-button'], {
      innerHTML: IconMenuSmall,
    }) as HTMLButtonElement;

    this.#renderButton();

    this.#eventBus.dispatchEvent(new BlockSettingsRenderedUIEvent({
      button: this.#button,
      blockSettings: this.#holder,
    }));

    this.#eventBus.addEventListener('ui:blocks:block-selected', this.#handleBlockSelected);
    this.#eventBus.addEventListener('ui:block-settings:open', this.#handleOpenRequest);
  }

  /**
   * Cleanup when plugin is destroyed
   */
  public destroy(): void {
    /**
     * The bus outlives the plugin, so a listener left on it keeps this instance alive and
     * answering: an open request after destroy would build a menu into a detached holder
     */
    this.#eventBus.removeEventListener('ui:blocks:block-selected', this.#handleBlockSelected);
    this.#eventBus.removeEventListener('ui:block-settings:open', this.#handleOpenRequest);

    this.#popover?.destroy();
    this.#popover = undefined;
    this.#holder.remove();
    this.#button.remove();
  }

  /**
   * Follows block selection, except while the menu is open -- re-targeting under an open menu
   * would leave the button and the menu pointing at different blocks
   * @param event - the selection event
   */
  #handleBlockSelected = (event: BlockSelectedUIEvent): void => {
    if (this.#isOpen) {
      return;
    }

    this.#selectedBlockIndex = event.detail.index;
  };

  /**
   * Opens the menu for the block another component asked about
   * @param event - the open request
   */
  #handleOpenRequest = (event: BlockSettingsOpenUIEvent): void => {
    void this.#open(event.detail.index);
  };

  /**
   * Gives the button its menu-button semantics and wires it to the menu
   */
  #renderButton(): void {
    this.#button.setAttribute('aria-label', messages.blockSettingsButton);
    this.#button.setAttribute('aria-haspopup', 'menu');
    this.#button.setAttribute('aria-expanded', 'false');

    this.#button.addEventListener('mousedown', () => {
      this.#wasOpenOnPointerDown = this.#isOpen;
    });

    this.#button.addEventListener('click', () => {
      const wasOpen = this.#wasOpenOnPointerDown;

      this.#wasOpenOnPointerDown = false;

      /**
       * Safari leaves a clicked button unfocused, and the popover would then capture
       * `document.body` as the element to restore focus to when it closes. Focusing the
       * button that owns the menu is also what the WAI-ARIA menu button pattern asks for
       */
      this.#button.focus();

      /**
       * A menu button dismisses the menu it opened. The popover has already closed itself by
       * now, so there is usually nothing left to close -- what matters is not re-opening it,
       * which is what made the button look inert on every second click
       */
      if (wasOpen) {
        this.#close();

        return;
      }

      void this.#open(this.#selectedBlockIndex);
    });
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
   * Closes the menu if it is open.
   *
   * `hide()` is asked first, so the popover tears down its own focus handling, and the
   * bookkeeping is then run directly: a popover that has already dropped its shown state hides
   * without emitting anything, which would leave the button advertising a menu that is gone
   */
  #close(): void {
    if (!this.#isOpen) {
      return;
    }

    this.#popover?.hide();

    this.#handleClosed();
  }

  /**
   * Records the menu as closed, once, whichever route closed it
   */
  #handleClosed = (): void => {
    if (!this.#isOpen) {
      return;
    }

    this.#isOpen = false;

    this.#button.setAttribute('aria-expanded', 'false');

    this.#eventBus.dispatchEvent(new BlockSettingsClosedUIEvent({}));
  };

  /**
   * Builds the menu for a block and opens it, unless there is nothing to show
   * @param index - position the opening request named
   */
  async #open(index: number): Promise<void> {
    const token = ++this.#openToken;
    const blockId = this.#api.blocks.getIdByIndex(index);

    /**
     * Nothing is selected, or the index is stale, so no provider is asked. Any menu still on
     * screen was built for a different block, and leaving it open would present one block's
     * settings as another's
     */
    if (blockId === undefined) {
      this.#close();

      return;
    }

    const items = await this.#collectItems({
      blockId,
      blockIndex: index,
      tool: this.#api.blocks.getToolByIndex(index) ?? '',
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

    this.#isOpen = true;
    this.#button.setAttribute('aria-expanded', 'true');

    this.#eventBus.dispatchEvent(new BlockSettingsOpenedUIEvent({}));
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
           * Providers are third-party code and this is the one place all of it runs, so without
           * isolation a single plugin throwing takes the whole menu down for every block. It
           * contributes nothing instead, and the stack identifies which one it was
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
   * Replaces the popover inside the holder with one built for the given items. Rebuilt rather
   * than edited in place because `removeItemByName` is ui-kit's only removal and a separator
   * carries no name, so a fresh popover is what keeps the previous block's items out of the
   * accessibility tree
   * @param items - items the menu should consist of
   */
  #renderPopover(items: PopoverItemParams[]): void {
    this.#popover?.destroy();

    /**
     * The item wrapper is left at ui-kit's default: `wrapperTag: 'button'`, carried over from
     * PR #157, is what ui-kit uses for its *inline* popover, where shrink-to-fit is the right
     * width. In a vertical menu a form control does not stretch to its container, so each row
     * came out as wide as its own label -- a partial hover highlight and the UA button font
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

    this.#popover.on(PopoverEvent.Closed, this.#handleClosed);

    this.#holder.innerHTML = '';
    this.#holder.appendChild(this.#popover.getElement());
  }
}

export * from './events/index.js';
