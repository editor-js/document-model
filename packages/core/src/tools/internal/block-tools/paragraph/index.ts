import type { BlockToolAdapter } from '@editorjs/dom-adapters';
import type { ToolConfig } from '@editorjs/editorjs';
import type { TextNodeSerialized } from '@editorjs/model';
import type { BlockTool, BlockToolConstructorOptions, BlockToolData } from '@editorjs/sdk';

/**
 * Data structure describing the tool's input/output data
 */
export type ParagraphData = BlockToolData<{
  /**
   * Text content of the paragraph
   */
  text: TextNodeSerialized;
}>;

/**
 * User-end configuration for the tool
 */
export type ParagraphConfig = ToolConfig<{
  /**
   * Placeholder for an empty paragraph
   */
  placeholder?: string;
}>;

/**
 * Base text block tool
 */
export class Paragraph implements BlockTool<ParagraphData, ParagraphConfig> {
  /**
   * Adapter for linking block data with the DOM
   */
  #adapter: BlockToolAdapter;

  /**
   * Tool's input/output data
   */
  #data: ParagraphData;

  /**
   * @param options - Block tool constructor options
   */
  constructor({ adapter, data }: BlockToolConstructorOptions<ParagraphData, ParagraphConfig>) {
    this.#adapter = adapter;
    this.#data = data;
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
