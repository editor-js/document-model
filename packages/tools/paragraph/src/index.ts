import type { ToolConfig } from 'editorjs-v2';
import type {
  BlockTool,
  BlockToolConstructor,
  BlockToolConstructorOptions,
  BlockToolData,
  KeyAddedEvent,
  TextNodeSerialized
} from '@editorjs/sdk';
import { KeyRemovedEvent } from '@editorjs/sdk';
import { ToolType } from '@editorjs/sdk';
import { IconText } from '@codexteam/icons';
import type { DOMBlockToolAdapter } from '@editorjs/dom-adapters';

/**
 * Accessible name of a paragraph block's editable element.
 *
 * Identifies the block *type*, so it reads identically on every paragraph in a document — see
 * the Open Questions in `openspec/changes/add-editor-aria-semantics/design.md` for whether that
 * should become per-instance. Named here rather than inline as the seam localisation would
 * attach to, mirroring `packages/ui/src/messages.ts`; i18n itself is out of scope for now
 */
const ARIA_LABEL = 'Paragraph';

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
    conversionConfig: {
      import: 'text',
      export: 'text',
    },
  };

  /**
   * Adapter for linking block data with the DOM
   */
  #adapter: DOMBlockToolAdapter;

  /**
   * Tool's wrapper
   */
  #wrapper: HTMLDivElement | undefined;

  /**
   * Paragraph input — contenteditable DIV element
   */
  #paragraph: HTMLDivElement | undefined;

  /**
   * Returns tool's wrapper, creates one if it doesn't exist yet
   * As we maintain the data-first approach, actual inputs should be rendered only when the model is updated.
   * Therefore, each tool needs a wrapper created before that — to have a place to insert inputs to
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
   * Hint describing what to type into an empty paragraph
   */
  #placeholder: string | undefined;

  /**
   * @param options - Block tool constructor options
   */
  constructor({ adapter, config }: BlockToolConstructorOptions<ParagraphData, ParagraphConfig, DOMBlockToolAdapter>) {
    this.#adapter = adapter;
    this.#placeholder = config?.placeholder;

    adapter.addEventListener('adapter:updated', this.#onUpdate);

    this.#adapter.registerTextInputKey<ParagraphData['text']>('text');
  }

  /**
   * Creates tool element
   */
  public render(): HTMLElement {
    return this.wrapper;
  }

  /**
   * Callback for Adapter updates
   * @param event - adapter event (KeyAdded, KeyRemoved or ValueChanged)
   */
  #onUpdate = (event: KeyAddedEvent | KeyRemovedEvent): void => {
    const { key } = event.detail;

    /**
     * Paragraph has only one key — 'text'.
     * If for some reason it's removed, we need to remove the element to avoid duplication
     */
    if (event instanceof KeyRemovedEvent) {
      this.#paragraph?.remove();
      this.#paragraph = undefined;

      this.#adapter.setInput(key, undefined);

      return;
    }

    const paragraph = document.createElement('div');

    paragraph.contentEditable = 'true';

    /**
     * Make the implicit contenteditable textbox role explicit and give the block
     * an accessible name, so assistive tech announces it as an editable text field
     */
    paragraph.setAttribute('role', 'textbox');
    paragraph.setAttribute('aria-multiline', 'true');
    paragraph.setAttribute('aria-label', ARIA_LABEL);

    /**
     * A contenteditable has no native placeholder, so an empty block would otherwise be
     * announced as just an unlabelled empty field. aria-placeholder is the ARIA equivalent
     * of the `placeholder` attribute and is announced when the field has no value
     */
    if (this.#placeholder !== undefined && this.#placeholder !== '') {
      paragraph.setAttribute('aria-placeholder', this.#placeholder);
    }

    paragraph.style.outline = 'none';
    paragraph.style.whiteSpace = 'pre-wrap';

    this.wrapper.append(paragraph);

    this.#adapter.setInput(key, paragraph);

    this.#paragraph = paragraph;
  };
}

Paragraph satisfies BlockToolConstructor<ParagraphData, ParagraphConfig, DOMBlockToolAdapter>;
