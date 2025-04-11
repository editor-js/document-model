import type { BlockAddedCoreEvent,
  BlockRemovedCoreEvent,
  EditorjsPlugin,
  EditorjsPluginParams } from '@editorjs/core';
import {
  CoreEventType
} from '@editorjs/core';
import type { EventBus } from '@editorjs/sdk';
import { UiComponentType } from '@editorjs/sdk';

import Style from './Blocks.module.pcss';
import { BeforeInputUIEvent } from './BeforeInputUIEvent.js';

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
   * EventBus instance to exchange events between components
   */
  #eventBus: EventBus;

  /**
   * EditorUI constructor method
   * @param params - Plugin parameters
   */
  constructor(params: EditorjsPluginParams) {
    this.#eventBus = params.eventBus;
    this.#blocksHolder = this.#prepareBlocksHolder(params.config.holder);

    this.#eventBus.addEventListener(`core:${CoreEventType.BlockAdded}`, (event: BlockAddedCoreEvent<HTMLElement>) => {
      const { ui, index } = event.detail;

      this.#addBlock(ui, index);
    });

    this.#eventBus.addEventListener(`core:${CoreEventType.BlockRemoved}`, (event: BlockRemovedCoreEvent) => {
      const { index } = event.detail;

      this.#removeBlock(index);
    });

    this.#blocksHolder.addEventListener('keydown', (e) => {
      if (e.code !== 'KeyZ') {
        return;
      }

      if (!(e.metaKey || e.ctrlKey)) {
        return;
      }

      if (e.shiftKey) {
        this.#eventBus.dispatchEvent(new Event('core:redo'));

        e.preventDefault();

        return;
      }

      this.#eventBus.dispatchEvent(new Event('core:undo'));

      e.preventDefault();
    });
  }

  /**
   * Prepares blocks holder element
   * @param editorHolder - user provided holder element for editor
   */
  #prepareBlocksHolder(editorHolder: HTMLElement): HTMLElement {
    const blocksHolder = document.createElement('div');

    blocksHolder.classList.add(Style['blocks']);

    blocksHolder.contentEditable = 'false';

    blocksHolder.addEventListener('beforeinput', (e) => {
      this.#eventBus.dispatchEvent(new BeforeInputUIEvent({
        data: e.data,
        inputType: e.inputType,
        isComposing: e.isComposing,
      }));
    });

    editorHolder.appendChild(blocksHolder);

    return blocksHolder;
  }

  /**
   * Renders block's content on the page
   * @param blockElement - block HTML element to add to the page
   * @param index - index where to add a block at
   */
  #addBlock(blockElement: HTMLElement, index: number): void {
    this.#validateIndex(index);

    if (index < this.#blocks.length) {
      this.#blocks[index].insertAdjacentElement('beforebegin', blockElement);
      this.#blocks.splice(index, 0, blockElement);
    } else {
      this.#blocksHolder.appendChild(blockElement);
      this.#blocks.push(blockElement);
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
   * Cleanup when plugin is destroyed
   */
  public destroy(): void {
    this.#blocks.forEach(block => block.remove());
    this.#blocks = [];
  }
}
