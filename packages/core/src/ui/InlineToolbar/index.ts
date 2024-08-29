import type { InlineToolsAdapter } from '@editorjs/dom-adapters';
import type { InlineTool, InlineToolsConfig } from '../../entities/InlineTool.js';
import type { InlineToolName } from '@editorjs/model';
import { type EditorJSModel, type TextRange, createInlineToolName, Index } from '@editorjs/model';
import { EventType } from '@editorjs/model';
import type { Nominal } from '@editorjs/model/dist/utils/Nominal';
import { make } from '@editorjs/dom';

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
  #inlineToolAdapter: InlineToolsAdapter;

  /**
   * Current selection range
   */
  #selectionRange: TextRange | undefined = undefined;

  /**
   * Tools that would be attached to the adapter
   */
  #tools: Map<InlineToolName, InlineTool>;

  /**
   * Toolbar html element related to the editor
   */
  #toolbar: HTMLElement | undefined = undefined;

  #holder: HTMLElement;

  /**
   * @param model - editor model instance
   * @param inlineToolAdapter - inline tool adapter instance
   * @param tools - tools, that should be attached to adapter
   * @param holder - editor holder element
   */
  constructor(model: EditorJSModel, inlineToolAdapter: InlineToolsAdapter, tools: InlineToolsConfig, holder: HTMLElement) {
    this.#model = model;
    this.#inlineToolAdapter = inlineToolAdapter;
    this.#holder = holder;
    this.#tools = new Map<InlineToolName, InlineTool>();

    Object.entries(tools).forEach(([toolName, toolConstructable]) => {
      /**
       * @todo - support inline tool options
       */
      this.#tools.set(createInlineToolName(toolName), new toolConstructable());
    });

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
    this.#tools.forEach((tool, toolName) => {
      this.#inlineToolAdapter.attachTool(toolName, tool);
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

    this.#tools.forEach((_tool, toolName) => {
      const inlineElementButton = make('button');

      inlineElementButton.innerHTML = toolName;

      inlineElementButton.addEventListener('click', (_event) => {
        this.apply(toolName);
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
   * Apply format with data formed in toolbar
   * @param toolName - name of the inline tool, whose format would be applied
   */
  public apply(toolName: InlineToolName): void {
    /**
     * @todo pass to applyFormat inline tool data formed in toolbar
     */
    this.#inlineToolAdapter.applyFormat(toolName, {} as Nominal<Record<string, unknown>, 'InlineToolData'>);
  };
}
