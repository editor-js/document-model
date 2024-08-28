import type { CaretAdapter, InlineTool, InlineToolAdapter } from '@editorjs/dom-adapters';
import { type EditorJSModel, type TextRange, Index } from '@editorjs/model';
import { EventType } from '@editorjs/model';
import type { Nominal } from '@editorjs/model/dist/utils/Nominal';
import { ref } from 'vue';
import { isNativeInput } from '@editorjs/dom';

/**
 *
 */
export class InlineToolbar {
  #model: EditorJSModel;

  #inlineToolAdapter: InlineToolAdapter;

  #caretAdapter: CaretAdapter;

  #selectionRange: TextRange | undefined = undefined;

  #tools: InlineTool[];

  public show = ref<boolean>(false);

  /**
   *
   * @param model
   * @param caretAdapter
   * @param inlineToolAdapter
   * @param tools
   */
  constructor(model: EditorJSModel, caretAdapter: CaretAdapter, inlineToolAdapter: InlineToolAdapter, tools: InlineTool[]) {
    this.#model = model;
    this.#caretAdapter = caretAdapter;
    this.#inlineToolAdapter = inlineToolAdapter;
    this.#tools = tools;

    this.#attachTools();

    this.#handleSelectionChange();
  }

  /**
   *
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
        console.log(selection.focusNode, typeof selection.focusNode);

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
   *
   */
  #attachTools(): void {
    this.#tools.forEach(tool => {
      this.#inlineToolAdapter.attachTool(tool);
    });
  }

  /**
   *
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
   * 
   * @param tool
   * @todo add data composing for tool
   */
  public apply(tool: InlineTool): void {
    this.#inlineToolAdapter.applyFormat(tool.name, {} as Nominal<Record<string, unknown>, 'InlineToolData'>, tool.intersectType);
  };
}
