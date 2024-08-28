import type { InlineTool, InlineToolsAdapter } from '@editorjs/dom-adapters';
import { type EditorJSModel, type TextRange, Index } from '@editorjs/model';
import { EventType } from '@editorjs/model';
import type { Nominal } from '@editorjs/model/dist/utils/Nominal';
import { ref } from 'vue';

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
   * Toolbar show state
   */
  public show = ref<boolean>(false);

  /**
   * @class
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
    this.#tools.forEach(tool => {
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
      this.show.value = true;
    } else {
      this.show.value = false;
    }
  }

  /**
   * Apply format with data formed in toolbar
   *
   * @param tool - tool, that was triggered
   */
  public apply(tool: InlineTool): void {
    /**
     * @todo pass to applyFormat inline tool data formed in toolbar
     */
    this.#inlineToolAdapter.applyFormat(tool.name, {} as Nominal<Record<string, unknown>, 'InlineToolData'>, tool.intersectType);
  };
}
