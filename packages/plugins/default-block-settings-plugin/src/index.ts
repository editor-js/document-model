import type {
  BlockId,
  EditorAPI,
  EditorjsPlugin,
  EditorjsPluginParams,
  EventBus
} from '@editorjs/sdk';
import { CoreEventType, PluginType } from '@editorjs/sdk';
import { IconChevronDown, IconChevronUp, IconCross, IconTrash } from '@codexteam/icons';
import type { BlockSettingsContext, BlockSettingsMenuConfig } from '@editorjs/ui';

/**
 * Order the provider registers at, which puts its items after every other provider's.
 * The built-in actions belong at the bottom of the menu
 */
const DEFAULT_SETTINGS_ORDER = 1000;

/**
 * Supplies the default entries of the block settings menu -- Move up, Move down and Delete --
 * as an ordinary plugin registered with the `block-settings` API.
 *
 * Nothing here is privileged: this is the reference example of what used to be a "block tune",
 * written the way any third-party plugin would write it.
 */
export class DefaultBlockSettingsPlugin implements EditorjsPlugin {
  /**
   * Registers with `core.use` under {@link PluginType.Plugin}
   */
  public static readonly type = PluginType.Plugin;

  /**
   * Identifier the editor registers this plugin under
   */
  public static readonly name = 'default-block-settings';

  /**
   * EditorAPI instance used to move and delete blocks
   */
  readonly #api: EditorAPI;

  /**
   * Event bus the ready listener is attached to
   */
  readonly #eventBus: EventBus;

  /**
   * Removes the provider again, once it has been registered
   */
  #unregister: (() => void) | undefined;

  /**
   * DefaultBlockSettingsPlugin class constructor
   * @param params - plugin parameters
   */
  constructor({ api, eventBus }: EditorjsPluginParams) {
    this.#api = api;
    this.#eventBus = eventBus;

    this.#eventBus.addEventListener(`core:${CoreEventType.Ready}`, this.#handleReady);
  }

  /**
   * Takes the provider back out of the menu.
   *
   * The ready listener goes too: the bus outlives the plugin, and a plugin destroyed before
   * the editor finished starting would otherwise register a provider afterwards -- one nothing
   * holds the unregister function for
   */
  public destroy(): void {
    this.#eventBus.removeEventListener(`core:${CoreEventType.Ready}`, this.#handleReady);

    this.#unregister?.();
    this.#unregister = undefined;
  }

  /**
   * Registers once the editor is ready
   */
  #handleReady = (): void => {
    this.#register();
  };

  /**
   * Registers the provider, unless the editor runs without a block settings menu.
   *
   * The lookup is deliberately late and optional: `api.plugins` is per editor instance, so a
   * headless `Core` that never registered `BlockSettingsUI` simply has no entry here and this
   * plugin stays inert rather than failing to initialise
   */
  #register(): void {
    const blockSettings = this.#api.plugins['block-settings'];

    if (blockSettings === undefined) {
      return;
    }

    this.#unregister = blockSettings.register(
      context => this.#items(context),
      { order: DEFAULT_SETTINGS_ORDER }
    );
  }

  /**
   * Builds the items for one block
   * @param context - the block the menu is being built for
   */
  #items({ blockId, blockIndex }: BlockSettingsContext): BlockSettingsMenuConfig {
    const lastIndex = this.#api.blocks.getBlocksCount() - 1;

    return [
      {
        name: 'move-up',
        title: 'Move up',
        icon: IconChevronUp,
        closeOnActivate: true,

        /**
         * A snapshot from when the menu was built, unlike the action below. Going stale
         * only greys an item out, while a stale index would move the wrong block
         */
        isDisabled: blockIndex <= 0,
        onActivate: () => this.#move(blockId, -1),
      },
      {
        name: 'move-down',
        title: 'Move down',
        icon: IconChevronDown,
        closeOnActivate: true,
        isDisabled: blockIndex >= lastIndex,
        onActivate: () => this.#move(blockId, 1),
      },
      {
        name: 'delete',
        title: 'Delete',
        icon: IconTrash,

        /**
         * Deletion asks first. The item turns into its own confirmation, and only that
         * confirmation carries the handler -- which is why this item has no `onActivate`
         */
        confirmation: {
          name: 'delete-confirm',
          title: 'Click to delete',
          icon: IconCross,
          closeOnActivate: true,
          onActivate: () => this.#delete(blockId),
        },
      },
    ];
  }

  /**
   * Moves the block one position in the given direction.
   *
   * The position is resolved from the id now rather than taken from the context: the menu may
   * have been open while a collaborator inserted a block above the target, or while an undo ran
   * @param blockId - id of the block to move
   * @param offset - -1 to move up, 1 to move down
   */
  #move(blockId: BlockId, offset: number): void {
    const fromIndex = this.#api.blocks.getIndexById(blockId);

    /**
     * The block is gone -- removed by a collaborator or an undo while the menu was open.
     * The lookup reports -1 rather than throwing, so there is nothing to recover from
     */
    if (fromIndex === -1) {
      return;
    }

    const toIndex = fromIndex + offset;

    if (toIndex < 0 || toIndex > this.#api.blocks.getBlocksCount() - 1) {
      return;
    }

    this.#api.blocks.move({
      fromIndex,
      toIndex,
    });
  }

  /**
   * Deletes the block, by id rather than by position
   * @param blockId - id of the block to delete
   */
  #delete(blockId: BlockId): void {
    if (this.#api.blocks.getIndexById(blockId) === -1) {
      return;
    }

    this.#api.blocks.delete({ block: blockId });
  }
}
