import type { FormattingAdapter } from '@editorjs/dom-adapters';
import type { InlineToolFormatData } from '@editorjs/sdk';
import type { InlineToolName } from '@editorjs/model';
import { type EditorJSModel, type TextRange, createInlineToolData, createInlineToolName, Index } from '@editorjs/model';
import { EventType } from '@editorjs/model';
import { make } from '@editorjs/dom';
import type { InlineToolFacade, ToolsCollection } from '../../tools/facades/index.js';

/**
 * Class determines, when inline toolbar should be rendered
 * Handles caret selection changes
 * Forms data required in certain inline tool
 */
export class InlineToolbar {
  /**
   * Editor model instance
   * Used for interactions with stored data
   */
  #model: EditorJSModel;

  /**
   * Inline tool adapter instance
   * Used for inline tools attaching and format apply
   */
  #formattingAdapter: FormattingAdapter;

  /**
   * Current selection range
   */
  #selectionRange: TextRange | undefined = undefined;

  /**
   * Tools that would be attached to the adapter
   */
  #tools: ToolsCollection<InlineToolFacade>;

  /**
   * Toolbar html element related to the editor
   */
  #toolbar: HTMLElement | undefined = undefined;

  #dataFormElement: HTMLElement | undefined = undefined;
  /**
   * Holder element of the editor
   */
  #holder: HTMLElement;

  /**
   * @param model - editor model instance
   * @param FormattingAdapter - inline tool adapter instance
   * @param tools - tools, that should be attached to adapter
   * @param holder - editor holder element
   */
  constructor(model: EditorJSModel, FormattingAdapter: FormattingAdapter, tools: ToolsCollection<InlineToolFacade>, holder: HTMLElement) {
    this.#model = model;
    this.#formattingAdapter = FormattingAdapter;
    this.#holder = holder;
    this.#tools = tools;

    this.#attachTools();

    this.#handleSelectionChange();
  }

  /**
   * Handle changes of the caret selection
   */
  #handleSelectionChange(): void {
    /**
     * Listen to selection change ivents in model
     */
    this.#model.addEventListener(EventType.CaretManagerUpdated, (event) => {
      const selection = window.getSelection();

      /**
       * Get current input with selection
       */
      if (selection) {
        /**
         * Check, that selection is in TEXT_NODE element, it means, that only selection in text contenteditable would render toolbar
         * Native inputs do not support inline tags, but they also would have selection, this is why we need this condition
         */
        if (selection.focusNode?.nodeType !== Node.TEXT_NODE) {
          return;
        }
      }

      if (event.detail.index !== null) {
        this.#selectionRange = Index.parse(event.detail.index).textRange;

        this.#selectionChanged();
      }
    });
  }

  /**
   * Attach all tools passed to the inline tool adapter
   */
  #attachTools(): void {
    Array.from(this.#tools.entries()).forEach(([toolName, tool]) => {
      this.#formattingAdapter.attachTool(toolName as InlineToolName, tool.create());
    });
  }

  /**
   * Change toolbar show state if any text is selected
   */
  #selectionChanged(): void {
    /**
     * Show or hide inline toolbar
     */
    if (this.#selectionRange !== undefined && this.#selectionRange[0] !== this.#selectionRange[1]) {
      this.#createToolbarElement();
    } else {
      this.#deleteToolbarElement();
    }
  }

  /**
   * @todo implement EventBus for ui to subscribe on selectionChange event
   * Creates inline toolbar html element
   */
  #createToolbarElement(): void {
    /**
     * Before creating new toolbar element, remove existing one
     */
    this.#deleteToolbarElement();

    this.#toolbar = make('div');

    Array.from(this.#tools.keys()).forEach((toolName) => {
      const inlineElementButton = make('button');

      inlineElementButton.innerHTML = toolName;

      inlineElementButton.addEventListener('click', (_event) => {
        this.renderToolActions(createInlineToolName(toolName));
      });
      if (this.#toolbar !== undefined) {
        this.#toolbar.appendChild(inlineElementButton);
      }
    });

    this.#holder.appendChild(this.#toolbar);
  }

  /**
   * Removes inline toolbar html element
   */
  #deleteToolbarElement(): void {
    this.#toolbar?.remove();
  }

  /**
   * Render actions to form data, which is required in tool
   * Element that is used for forming data is rendered inside of the tool instance
   * This function adds actions element to the toolbar
   * @param nameOfTheTool - name of the inline tool, whose format would be applied
   */
  public renderToolActions(nameOfTheTool: InlineToolName): void {
    const elementWithOptions = this.#formattingAdapter.formatData(nameOfTheTool, (data: InlineToolFormatData): void => {
      this.apply(nameOfTheTool, data);
    });

    /**
     * Do not render toolbar data former if element with options is null
     * It means, that tool does not need any data, and callback will be triggered in adapter
     */
    if (elementWithOptions === null) {
      return;
    }

    this.#dataFormElement = elementWithOptions.element;

    if (this.#toolbar === undefined) {
      throw new Error('InlineToolbar: can not show tool actions without toolbar');
    }

    this.#holder.appendChild(this.#dataFormElement);
  };

  /**
   * Apply format of the inline tool to the model
   * @param toolName - name of the tool which format would be applied
   * @param formatData - formed data required in the inline tool
   */
  public apply(toolName: InlineToolName, formatData: InlineToolFormatData): void {
    this.#dataFormElement?.remove();

    this.#formattingAdapter.applyFormat(toolName, createInlineToolData(formatData));
  }
}
