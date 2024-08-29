import type { InlineToolsAdapter } from '@editorjs/dom-adapters';
import type { InlineTool } from '../../entities/InlineTool.js';
import { type EditorJSModel, type TextRange, Index } from '@editorjs/model';
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
  #tools: InlineTool[];

  /**
   * Toolbar html element related to the editor
   */
  #toolbar: HTMLElement | undefined = undefined;

  /**
   * @param model - editor model instance
   * @param inlineToolAdapter - inline tool adapter instance
   * @param tools - tools, that should be attached to adapter
   */
  constructor(model: EditorJSModel, inlineToolAdapter: InlineToolsAdapter, tools: InlineTool[]) {
    this.#model = model;
    this.#inlineToolAdapter = inlineToolAdapter;
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
         * Do not render inline toolbar for not contenteditable elements
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
    this.#tools.forEach((tool) => {
      this.#inlineToolAdapter.attachTool(tool);
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
   * Creates inline toolbar html element
   */
  #createToolbarElement(): void {
    /**
     * Before creating new toolbar element, remove existing one
     */
    this.#deleteToolbarElement();

    const selection = window.getSelection();

    this.#toolbar = make('div');

    this.#tools.forEach((tool) => {
      const inlineElementButton = make('button');

      inlineElementButton.innerHTML = tool.name;

      inlineElementButton.addEventListener('click', (_) => {
        this.apply(tool);
      });
      if (this.#toolbar !== undefined) {
        this.#toolbar.appendChild(inlineElementButton);
      }
    });

    /**
     * Get current input with selection
     */
    if (selection) {
      /**
       * Do not render inline toolbar for not contenteditable elements
       */
      if (selection.focusNode !== null && selection.anchorNode !== null) {
        selection.focusNode.parentElement?.parentNode?.insertBefore(this.#toolbar, selection.focusNode.parentElement);
      }
    }
  }

  /**
   * Removes inline toolbar html element
   */
  #deleteToolbarElement(): void {
    this.#toolbar?.remove();
  }

  /**
   * Apply format with data formed in toolbar
   * @param tool - tool, that was triggered
   */
  public apply(tool: InlineTool): void {
    /**
     * @todo pass to applyFormat inline tool data formed in toolbar
     */
    this.#inlineToolAdapter.applyFormat(tool.name, {} as Nominal<Record<string, unknown>, 'InlineToolData'>);
  };
}
