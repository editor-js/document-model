import 'reflect-metadata';
import { Inject, Service } from 'typedi';
import { CoreConfigValidated } from '../../entities/index.js';

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

  /**
   * EditorUI constructor method
   * @param config - EditorJS validated configuration
   */
  constructor(@Inject('EditorConfig') config: CoreConfigValidated) {
    this.#holder = config.holder;
  }

  /**
   * Renders the editor UI
   */
  public render(): void {
    // will add UI to holder element
  }

  /**
   * Adds toolbox to the editor UI
   * @param toolboxElement - toolbox HTML element to add to the page
   */
  public addToolbox(toolboxElement: HTMLElement): void {
    this.#holder.appendChild(toolboxElement);
  }

  /**
   * Renders block's content on the page
   * @param blockElement - block HTML element to add to the page
   * @param index - index where to add a block at
   */
  public addBlock(blockElement: HTMLElement, index: number): void {
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
  public removeBlock(index: number): void {
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
