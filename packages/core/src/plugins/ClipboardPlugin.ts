import type { CopyUIEvent, EditorAPI, EditorjsPlugin, EditorjsPluginParams } from '@editorjs/sdk';
import { CopyUIEventName } from '@editorjs/sdk';
import { PluginType } from '@editorjs/sdk';

/**
 * @todo update doc
 */
export class ClipboardPlugin implements EditorjsPlugin {
  public static readonly type = PluginType.Plugin;

  readonly #api: EditorAPI;

  /**
   * @param params @todo update doc
   */
  constructor(params: EditorjsPluginParams) {
    const { api, eventBus } = params;

    this.#api = api;

    eventBus.addEventListener(`ui:${CopyUIEventName}`, (e: CopyUIEvent) => {
      const { nativeEvent } = e.detail;

      const selectedBlocks = this.#api.selection.selectedBlocks;

      /**
       * Don't override native event if there are no blocks selected
       */
      if (selectedBlocks === null || selectedBlocks.length === 0) {
        return;
      }

      nativeEvent.preventDefault();

      const currentDOMSelection = window.getSelection();

      if (!currentDOMSelection) {
        return;
      }

      const selectionAsPlainText = currentDOMSelection?.toString() ?? '';
      const selectionAsHTML = this.#parseDOMSelectionToHTML(currentDOMSelection);

      nativeEvent.clipboardData?.setData('text/plain', selectionAsPlainText);
      nativeEvent.clipboardData?.setData('text/html', selectionAsHTML);
      nativeEvent.clipboardData?.setData('application/x-editor-js', JSON.stringify(selectedBlocks));
    });
  }

  /**
   * @todo update doc
   */
  public destroy(): void {
    // do nothing
  }

  /**
   *
   * @param selection
   */
  #parseDOMSelectionToHTML(selection: Selection): string {
    if (selection.rangeCount === 0) {
      return '';
    }

    const container = document.createElement('div');

    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i);

      container.appendChild(range.cloneContents());
    }

    return container.innerHTML;
  }
}
