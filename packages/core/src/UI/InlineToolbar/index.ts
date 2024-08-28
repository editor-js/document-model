import type { InlineTool, InlineToolsAdapter } from '@editorjs/dom-adapters';
import { type EditorJSModel, type TextRange, Index } from '@editorjs/model';
import { EventType } from '@editorjs/model';
import type { Nominal } from '@editorjs/model/dist/utils/Nominal';

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
   * Toolbar show state
   */
  #show: boolean = false;

  /**
   * Toolbar show state
   */
  public get show(): boolean {
    return this.#show;
  };

  /**
   * @param state - state of the show property
   */
  private set show(state: boolean) {
    this.#show = state;
  }

  /**
   * @param model - editor model instance
   * @param inlineToolAdapter - inline tool adapter instance
   */
  constructor(model: EditorJSModel, inlineToolAdapter: InlineToolsAdapter) {
    this.#model = model;
    this.#inlineToolAdapter = inlineToolAdapter;

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
   * Change toolbar show state if any text is selected
   */
  #selectionChanged(): void {
    /**
     * Show or hide inline toolbar
     */
    if (this.#selectionRange !== undefined && this.#selectionRange[0] !== this.#selectionRange[1]) {
      this.show = true;
    } else {
      this.show = false;
    }
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
