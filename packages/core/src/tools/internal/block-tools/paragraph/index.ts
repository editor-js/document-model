import type { ToolConfig } from '@editorjs/editorjs';
import type { TextNodeSerialized } from '@editorjs/model';
import type {
  BlockTool,
  BlockToolConstructor,
  BlockToolConstructorOptions,
  BlockToolData,
  KeyAddedEvent
} from '@editorjs/sdk';
import { KeyRemovedEvent } from '@editorjs/sdk';
import { ToolType } from '@editorjs/sdk';
import { IconText } from '@codexteam/icons';
import type { DOMBlockToolAdapter } from '@editorjs/dom-adapters';

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
  #adapter: DOMBlockToolAdapter;

  #wrapper: HTMLDivElement | undefined;

  #paragraph: HTMLDivElement | undefined;

  /**
   *
   */
  private get wrapper(): HTMLDivElement {
    if (this.#wrapper !== undefined) {
      return this.#wrapper;
    }

    this.#wrapper = document.createElement('div');

    this.#wrapper.classList.add('editorjs-paragraph');

    return this.#wrapper;
  }

  /**
   * @param options - Block tool constructor options
   */
  constructor({ adapter }: BlockToolConstructorOptions<ParagraphData, ParagraphConfig, DOMBlockToolAdapter>) {
    this.#adapter = adapter;

    adapter.addEventListener('adapter:updated', this.#onUpdate);

    this.#adapter.registerTextInputKey<ParagraphData['text']>('text');
  }

  /**
   * Creates tool element
   */
  public render(): HTMLElement {
    return this.wrapper;
  }

  #onUpdate = (event: KeyAddedEvent | KeyRemovedEvent): void => {
    const { key } = event.detail;

    if (event instanceof KeyRemovedEvent) {
      this.#paragraph?.remove();
      this.#paragraph = undefined;

      this.#adapter.setInput(key, undefined);

      return;
    }

    const paragraph = document.createElement('div');

    paragraph.contentEditable = 'true';
    paragraph.style.outline = 'none';
    paragraph.style.whiteSpace = 'pre-wrap';

    this.wrapper.append(paragraph);

    this.#adapter.setInput(key, paragraph);

    this.#paragraph = paragraph;
  };
}

Paragraph satisfies BlockToolConstructor<ParagraphData, ParagraphConfig, DOMBlockToolAdapter>;
