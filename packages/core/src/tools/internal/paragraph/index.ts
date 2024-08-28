import type { BlockToolAdapter } from '@editorjs/dom-adapters';
import type { BlockTool, BlockToolConstructorOptions } from '../../../entities/BlockTool.js';

/**
 * Base text block tool
 */
export class Paragraph implements BlockTool {
  /**
   * Adapter for linking block data with the DOM
   */
  #adapter: BlockToolAdapter;
  /**
   * @param options - Block tool constructor options
   */
  constructor({ blockToolAdapter }: BlockToolConstructorOptions) {
    this.#adapter = blockToolAdapter;
  }

  /**
   * Creates tool element
   */
  public render(): HTMLElement {
    const wrapper = document.createElement('div');

    wrapper.contentEditable = 'true';
    wrapper.style.outline = 'none';

    this.#adapter.attachInput('text', wrapper);

    return wrapper;
  }
}
