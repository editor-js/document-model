import type { CaretAdapter, InlineTool, InlineToolAdapter } from '@editorjs/dom-adapters';
import type { EditorJSModel, TextRange } from '@editorjs/model';
import { EventType } from '@editorjs/model';
import type { Nominal } from '@editorjs/model/dist/utils/Nominal';
import { ref } from 'vue';

/**
 *
 */
export class InlineToolbar {
  #model: EditorJSModel;

  #inlineToolAdapter: InlineToolAdapter;

  #caretAdapter: CaretAdapter;

  #selectionRange: TextRange | null = null;

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
      this.#selectionRange = event.detail.index?.textRange ?? null;

      this.#selectionChanged();
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
    if (this.#selectionRange !== null && this.#selectionRange[0] !== this.#selectionRange[1]) {
      this.show.value = true;
    } else {
      this.show.value = false;
    }
  }

  /**
   *
   * @param tool
   */
  public apply(tool: InlineTool): void {
    this.#inlineToolAdapter.applyFormat(tool.name, {} as Nominal<Record<string, unknown>, 'InlineToolData'>, tool.intersectType);
  };
}
