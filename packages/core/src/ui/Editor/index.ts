import 'reflect-metadata';
import { Inject, Service } from 'typedi';
import { CoreConfigValidated } from '../../entities/index.js';
import { EventBus } from '../../components/EventBus/index.js';
import { BlockAddedCoreEvent, CoreEventType } from '../../components/EventBus/index.js';
import { ToolboxRenderedUIEvent } from '../Toolbox/index.js';

/**
 * Editor's main UI renderer for HTML environment
 *  - renders the editor UI
 *  - adds and removes blocks on the page
 *  - handles user UI interactions
 */
@Service()
export class EditorUI {
  /**
   * Editor holder element
   */
  #holder: HTMLElement;
  /**
   * Elements of the blocks added to the editor
   */
  #blocks: HTMLElement[] = [];

  #eventBus: EventBus;

  /**
   * EditorUI constructor method
   * @param config - EditorJS validated configuration
   * @param eventBus - EventBus instance to exchange events between components
   */
  constructor(@Inject('EditorConfig') config: CoreConfigValidated, eventBus: EventBus) {
    this.#holder = config.holder;
    this.#eventBus = eventBus;

    this.#eventBus.addEventListener(`core:${CoreEventType.BlockAdded}`, (event: BlockAddedCoreEvent<HTMLElement>) => {
      const { ui, index } = event.detail;

      this.#addBlock(ui, index);
    });

    this.#eventBus.addEventListener(`core:${CoreEventType.BlockRemoved}`, (event: BlockAddedCoreEvent<HTMLElement>) => {
      const { index } = event.detail;

      this.#removeBlock(index);
    });

    this.#eventBus.addEventListener(`ui:toolbox:rendered`, (event: ToolboxRenderedUIEvent) => {
      this.#addToolbox(event.detail.toolbox);
    });
  }

  /**
   * Renders the editor UI
   * @todo replace with the event handler
   */
  public render(): void {
    // will add UI to holder element
  }

  /**
   * Adds toolbox to the editor UI
   * @param toolboxElement - toolbox HTML element to add to the page
   */
  #addToolbox(toolboxElement: HTMLElement): void {
    this.#holder.appendChild(toolboxElement);
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
      this.#holder.appendChild(blockElement);
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
}
