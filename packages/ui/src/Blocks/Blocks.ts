import type { EventBus,
  BlockAddedCoreEvent,
  BlockRemovedCoreEvent, CopyUIEventPayload,
  EditorjsPlugin,
  EditorjsPluginParams, EditorAPI } from '@editorjs/sdk';
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
 * Editor's main UI renderer for HTML environment
 *  - renders the editor UI
 *  - adds and removes blocks on the page
 *  - handles user UI interactions
 */
export class BlocksUI implements EditorjsPlugin {
  /**
   * Plugin type
   */
  public static readonly type = UiComponentType.Blocks;

  /**
   * Blocks holder element
   */
  #blocksHolder: HTMLElement;

  /**
   * Elements of the blocks added to the editor
   */
  #blocks: HTMLElement[] = [];

  /**
   * Position of the block last announced as selected, so the same one is not announced twice.
   * `selectionchange` fires on every keystroke, and only a move to another block is news
   */
  #selectedBlockIndex = -1;

  /**
   * EventBus instance to exchange events between components
   */
  #eventBus: EventBus;

  /**
   * Editor's API
   */
  #api: EditorAPI;

  /**
   * EditorUI constructor method
   * @param params - Plugin parameters
   */
  constructor(params: EditorjsPluginParams) {
    this.#eventBus = params.eventBus;
    this.#api = params.api;
    this.#blocksHolder = this.#prepareBlocksHolder();

    this.#eventBus.addEventListener(`core:${CoreEventType.BlockAdded}`, (event: BlockAddedCoreEvent<HTMLElement>) => {
      const { ui, index } = event.detail;

      this.#addBlock(ui, index);
    });

    this.#eventBus.addEventListener(`core:${CoreEventType.BlockRemoved}`, (event: BlockRemovedCoreEvent) => {
      const { index } = event.detail;

      this.#removeBlock(index);
    });

    document.addEventListener('selectionchange', this.#handleSelectionChange);

    this.#eventBus.dispatchEvent(new BlocksHolderRenderedUIEvent({
      blocksHolder: this.#blocksHolder,
    }));
  }

  /**
   * Prepares blocks holder element
   */
  #prepareBlocksHolder(): HTMLElement {
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
    });

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
    });

    blocksHolder.addEventListener('copy', (e) => {
      const payload: CopyUIEventPayload = {
        nativeEvent: e,
      };

      this.#eventBus.dispatchEvent(new CopyUIEvent(payload));
    });

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
    this.#validateIndex(index);

    const wrapper = make('div', Style[blockCss.block]);
    const contents = make('div', Style[blockCss.contents]);

    wrapper.addEventListener('mouseenter', (e) => {
      this.#updateSelectedBlock(e);
    });

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

    this.#selectBlock(block, this.#blocks.indexOf(block));
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
    if (index === this.#selectedBlockIndex) {
      return;
    }

    this.#selectedBlockIndex = index;

    this.#eventBus.dispatchEvent(new BlockSelectedUIEvent({
      block,
      index,
    }));
  }

  /**
   * Cleanup when plugin is destroyed
   */
  public destroy(): void {
    document.removeEventListener('selectionchange', this.#handleSelectionChange);

    this.#blocks.forEach(block => block.remove());
    this.#blocks = [];
  }
}
