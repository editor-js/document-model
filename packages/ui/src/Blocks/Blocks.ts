import type { EventBus,
  BlockAddedCoreEvent,
  BlockRemovedCoreEvent, CopyUIEventPayload,
  EditorjsPlugin,
  EditorjsPluginParams, EditorAPI, BlockId } from '@editorjs/sdk';
import {
  CoreEventType,
  CopyUIEvent,
  KeydownUIEvent,
  UiComponentType,
  BeforeInputUIEvent
} from '@editorjs/sdk';
import Style from './Blocks.module.pcss';
import { isNativeInput, make } from '@editorjs/dom';
import { BlocksHolderRenderedUIEvent, BlockSelectedUIEvent } from './events/index.js';
import { blockCss, blocksCss } from './Blocks.const.js';

/**
 * A block the editor's UI treats as selected: its wrapper element, and the position it holds now
 */
export interface SelectedBlock {
  /**
   * Wrapper element of the block, which is what a caller positions against
   */
  block: HTMLElement;

  /**
   * Id of the block, which stays its own however the document moves around it
   */
  id: BlockId;
}

/**
 * Public API the Blocks plugin exposes as `api.plugins.blocksUI`
 */
export interface BlocksUIAPI {
  /**
   * The block the UI treats as selected: the one last reported by the pointer entering it or by the caret moving
   * into it. This is the UI's own notion, not the model's selection, which `core:selection-changed` carries
   * @returns the block's element and id, or `undefined` when none has been reported or it has been removed
   */
  getSelectedBlock(): SelectedBlock | undefined;
}

declare module '@editorjs/sdk' {
  /* eslint-disable jsdoc/require-jsdoc -- interface members are documented on the types they alias */
  interface EditorjsPluginApiMap {
    /**
     * Blocks plugin's public API
     */
    blocksUI: BlocksUIAPI;
  }
  /* eslint-enable jsdoc/require-jsdoc */
}

/**
 * Editor's main UI renderer for HTML environment
 *  - renders the editor UI
 *  - adds and removes blocks on the page
 *  - handles user UI interactions
 */
export class BlocksUI implements EditorjsPlugin<'blocksUI'> {
  /**
   * Plugin type
   */
  public static readonly type = UiComponentType.Blocks;

  /**
   * Plugin name -- keys `api.plugins.blocksUI`
   */
  public static readonly name = 'blocksUI';

  /**
   * API telling other plugins which block the UI treats as selected.
   *
   * Exposed because selection reaches them as a one-shot event, and a plugin that ignores one on purpose -- as the
   * toolbar and the settings menu both do while a popover holds them -- has no other way to find out what it missed
   */
  public readonly publicApi: BlocksUIAPI;

  /**
   * Blocks holder element
   */
  #blocksHolder: HTMLElement;

  /**
   * Elements of the blocks added to the editor
   */
  #blocks: HTMLElement[] = [];

  /**
   * The block last announced as selected. Held as the element, because a position recorded earlier comes to name a
   * different block once one is added or removed above it, and that block would then read as already announced
   */
  #announcedBlock: HTMLElement | null = null;

  /**
   * The position that block held when it was announced. A change means the block itself moved on the page, which
   * the toolbar follows off this event and nothing else -- so it is news even though the selection stayed put
   */
  #announcedIndex = -1;

  /**
   * EventBus instance to exchange events between components
   */
  #eventBus: EventBus;

  /**
   * Editor's API
   */
  #api: EditorAPI;

  /**
   * Controls the lifetime of this plugin's DOM and EventBus listeners
   */
  #listenersController = new AbortController();

  /**
   * EditorUI constructor method
   * @param params - Plugin parameters
   */
  constructor(params: EditorjsPluginParams) {
    const { signal } = this.#listenersController;

    this.#eventBus = params.eventBus;
    this.#api = params.api;

    this.publicApi = {
      getSelectedBlock: () => this.#selectedBlock(),
    };
    this.#blocksHolder = this.#prepareBlocksHolder();

    this.#eventBus.addEventListener(`core:${CoreEventType.BlockAdded}`, (event: BlockAddedCoreEvent<HTMLElement>) => {
      const { ui, index } = event.detail;

      this.#addBlock(ui, index);
    }, { signal });

    this.#eventBus.addEventListener(`core:${CoreEventType.BlockRemoved}`, (event: BlockRemovedCoreEvent) => {
      const { index } = event.detail;

      this.#removeBlock(index);
    }, { signal });

    document.addEventListener('selectionchange', this.#handleSelectionChange, { signal });

    this.#eventBus.dispatchEvent(new BlocksHolderRenderedUIEvent({
      blocksHolder: this.#blocksHolder,
    }));
  }

  /**
   * Prepares blocks holder element
   */
  #prepareBlocksHolder(): HTMLElement {
    const { signal } = this.#listenersController;

    const blocksHolder = make('div', Style[blocksCss.blocks], {
      contentEditable: true,
    });

    /**
     * The holder is a structural container, not an editable region of its own.
     * Being contenteditable, it would otherwise be implicitly mapped to role="textbox"
     * — nesting a textbox inside the textbox each block already exposes.
     * Each block owns its own role="textbox" and accessible name instead.
     */
    blocksHolder.setAttribute('role', 'group');

    /**
     * Workaround Safari behavior when it deletes blocks if there is no content in them
     * E.g. when you delete all content in the only block, it deletes the block
     */
    this.#addHostHolder(blocksHolder);

    blocksHolder.addEventListener('beforeinput', (e) => {
      e.preventDefault();

      const isInputNative = isNativeInput(e.target as HTMLElement);

      let data: string;

      /**
       * For native inputs data for those events comes from event.data property
       * while for contenteditable elements it's stored in event.dataTransfer
       * @see https://www.w3.org/TR/input-events-2/#overview
       */
      if (isInputNative) {
        data = e.data ?? '';
      } else {
        data = e.dataTransfer?.getData('text/plain') ?? e.data ?? '';
      }

      const isCrossInputSelection = e.getTargetRanges().some(range => range.startContainer !== range.endContainer);

      this.#eventBus.dispatchEvent(new BeforeInputUIEvent({
        data,
        inputType: e.inputType,
        isComposing: e.isComposing,
        targetRanges: e.getTargetRanges(),
        isCrossInputSelection,
      }));
    }, { signal });

    blocksHolder.addEventListener('keydown', (e) => {
      /**
       * Delegate the keydown so plugins (e.g. Shortcuts) can act on it first.
       * The bus dispatches synchronously, so a plugin that handled the key has already
       * called preventDefault by the time this returns — treat that as "consumed".
       */
      this.#eventBus.dispatchEvent(new KeydownUIEvent({ nativeEvent: e }));

      if (e.defaultPrevented) {
        return;
      }

      if (e.code !== 'KeyZ') {
        return;
      }

      if (!(e.metaKey || e.ctrlKey)) {
        return;
      }

      if (e.shiftKey) {
        this.#api.document.redo();

        e.preventDefault();

        return;
      }

      this.#api.document.undo();

      e.preventDefault();
    }, { signal });

    blocksHolder.addEventListener('copy', (e) => {
      const payload: CopyUIEventPayload = {
        nativeEvent: e,
      };

      this.#eventBus.dispatchEvent(new CopyUIEvent(payload));
    }, { signal });

    return blocksHolder;
  }

  /**
   * Adds host holder that will prevent Safari from deleting blocks if there is no content host
   * @param blocksHolder - blocks holder element
   */
  #addHostHolder(blocksHolder: HTMLElement): void {
    const zeroWidthSpaceWrapper = document.createElement('span');
    const zeroWidthSpace = document.createTextNode('\u200B');

    zeroWidthSpaceWrapper.classList.add(Style['host-holder']);

    /**
     * Purely a DOM workaround with no content of its own - without this, assistive tech can
     * land on it and read out its zero-width-space text node as if it were real content
     */
    zeroWidthSpaceWrapper.setAttribute('aria-hidden', 'true');
    zeroWidthSpaceWrapper.appendChild(zeroWidthSpace);

    blocksHolder.appendChild(zeroWidthSpaceWrapper);
  }

  /**
   * Renders block's content on the page
   * @param blockElement - block HTML element to add to the page
   * @param index - index where to add a block at
   */
  #addBlock(blockElement: HTMLElement, index: number): void {
    const { signal } = this.#listenersController;

    this.#validateIndex(index);

    const wrapper = make('div', Style[blockCss.block]);
    const contents = make('div', Style[blockCss.contents]);

    wrapper.addEventListener('mouseenter', (e) => {
      this.#updateSelectedBlock(e);
    }, { signal });

    wrapper.append(contents);
    contents.append(blockElement);

    if (index < this.#blocks.length) {
      this.#blocks[index].insertAdjacentElement('beforebegin', wrapper);
      this.#blocks.splice(index, 0, wrapper);
    } else {
      this.#blocksHolder.appendChild(wrapper);
      this.#blocks.push(wrapper);
    }
  }

  /**
   * Removes block from the page
   * @param index - index where to remove block at
   */
  #removeBlock(index: number): void {
    this.#validateIndex(index);

    this.#blocks[index].remove();
    this.#blocks.splice(index, 1);
  }

  /**
   * Validates index to be in bounds of the blocks array
   * @param index - index to validate
   */
  #validateIndex(index: number): void {
    if (index < 0 || index > this.#blocks.length) {
      throw new Error('Index out of bounds');
    }
  }

  /**
   * Dispatches block selected event on mouseenter events on a block element
   * @param event - MouseEvent
   */
  #updateSelectedBlock(event: MouseEvent): void {
    const block = event.target as HTMLElement;

    /**
     * Announced without deduplication, unlike a caret move. `mouseenter` only fires when the
     * pointer actually crosses into a block, so there is no repetition here to suppress -- and
     * suppressing it is wrong: a listener that ignored the last announcement, as the toolbar
     * and the settings menu both do while the menu is open, would otherwise never hear that
     * the pointer came back
     */
    this.#announceSelectedBlock(block, this.#blocks.indexOf(block));
  }

  /**
   * Reports the block the caret is in, so that "the selected block" means something to a user
   * who never moves a pointer.
   *
   * Hover was the only source of selection, which left every control acting on the selected
   * block -- the toolbar's settings button among them -- doing nothing at all from the
   * keyboard. Read here rather than from the editor's own caret state because that is cleared
   * the moment focus leaves the editable, which is exactly what reaching for a toolbar does
   */
  #handleSelectionChange = (): void => {
    const selection = document.getSelection();
    const anchor = selection?.anchorNode ?? null;

    if (anchor === null) {
      return;
    }

    const index = this.#blocks.findIndex(block => block.contains(anchor));

    if (index === -1) {
      return;
    }

    this.#selectBlock(this.#blocks[index], index);
  };

  /**
   * Announces the block to work on, unless it is the one already announced
   * @param block - the block's wrapper element
   * @param index - its position in the document
   */
  #selectBlock(block: HTMLElement, index: number): void {
    /**
     * `selectionchange` fires for every caret move, most of which stay inside one block, so
     * announcing each one would be noise. Pointer entry is announced unconditionally instead
     */
    if (block === this.#announcedBlock && index === this.#announcedIndex) {
      return;
    }

    this.#announceSelectedBlock(block, index);
  }

  /**
   * Reports the selected block to everything that follows it
   * @param block - element of the selected block
   * @param index - position of the block in the document
   */
  #announceSelectedBlock(block: HTMLElement, index: number): void {
    this.#announcedBlock = block;
    this.#announcedIndex = index;

    this.#eventBus.dispatchEvent(new BlockSelectedUIEvent({
      block,
      index,
    }));
  }

  /**
   * The block last announced as selected, with its id read through the position it holds now rather than the one it
   * held then. Nothing is returned once it has left the document, so a caller is never handed an orphaned wrapper
   */
  #selectedBlock(): SelectedBlock | undefined {
    if (this.#announcedBlock === null) {
      return undefined;
    }

    const index = this.#blocks.indexOf(this.#announcedBlock);

    if (index === -1) {
      return undefined;
    }

    const id = this.#api.blocks.getIdByIndex(index);

    if (id === undefined) {
      return undefined;
    }

    return {
      block: this.#announcedBlock,
      id,
    };
  }

  /**
   * Cleanup when plugin is destroyed
   */
  public destroy(): void {
    /**
     * Already destroyed: a second call has nothing left to release
     */
    if (this.#listenersController.signal.aborted) {
      return;
    }

    this.#listenersController.abort();

    /**
     * Detaching the holder takes the block wrappers inside it along
     */
    this.#blocksHolder.remove();

    this.#blocks = [];
    this.#announcedBlock = null;
    this.#announcedIndex = -1;
  }
}
