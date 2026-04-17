import type { ToolConfig } from '@editorjs/editorjs';
import type { TextNodeSerialized } from '@editorjs/model';
import type {
  BlockTool,
  BlockToolAdapter,
  BlockToolConstructor,
  BlockToolConstructorOptions,
  BlockToolData
} from '@editorjs/sdk';
import { ToolType } from '@editorjs/sdk';
import { IconText } from '@codexteam/icons';

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
  public static type = ToolType.Block as const;

  public static name = 'paragraph';

  public static readonly options = {
    toolbox: {
      title: 'Text',
      icon: IconText,
    },
  };

  /**
   * Adapter for linking block data with the DOM
   */
  #adapter: BlockToolAdapter;

  /**
   * Tool's input/output data
   */
  #data: ParagraphData;

  #wrapper!: HTMLDivElement;

  /**
   * @param options - Block tool constructor options
   */
  constructor({ adapter, data }: BlockToolConstructorOptions<ParagraphData, ParagraphConfig>) {
    this.#adapter = adapter;
    this.#data = data;

    this.#buildUI();

    this.#adapter.init(this, this.onUpdate);
    this.#adapter.registerKey('text', 'text');
  }

  #buildUI(): void {
    const wrapper = document.createElement('div');

    wrapper.classList.add('editorjs-paragraph');

    this.#wrapper = wrapper;
  }

  /**
   * Creates tool element
   */
  public render(): HTMLElement {
    return this.#wrapper;
  }

  onUpdate = (key: string, type: 'text' | 'value'): HTMLElement => {
    const paragraph = document.createElement('div');

    paragraph.contentEditable = 'true';
    paragraph.style.outline = 'none';
    paragraph.style.whiteSpace = 'pre-wrap';

    this.#wrapper.append(paragraph);

    return paragraph;
  };
}

Paragraph satisfies BlockToolConstructor<ParagraphData>;
