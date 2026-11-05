import type { BlockData, CopyUIEvent, EditorAPI, EditorjsPlugin, EditorjsPluginParams } from '@editorjs/sdk';
import { CopyUIEventName } from '@editorjs/sdk';
import { PluginType } from '@editorjs/sdk';

/**
 * Custom EditorJS data-type object for clipboard events
 */
interface ClipboardEditorJSObject {
  /**
   * Array of copied blocks data
   */
  blocks: BlockData[];
}

/**
 * Custom MIME type used to store EditorJS clipboard data alongside plain text and HTML
 */
const EDITOR_JS_CLIPBOARD_MIME_TYPE = 'application/x-editor-js';

/**
 * Clipboard plugin handles copy events and provides rich clipboard data for selected blocks.
 * When a user copies content, this plugin intercepts the event and adds EditorJS-specific data
 * including the selected blocks data alongside plain text and HTML content.
 */
export class ClipboardPlugin implements EditorjsPlugin {
  public static readonly type = PluginType.Plugin;

  /**
   * Plugin name used to identify the plugin across the editor
   */
  public static readonly name = 'clipboard';

  readonly #api: EditorAPI;

  /**
   * Releases the plugin's listeners on destroy
   */
  readonly #controller = new AbortController();

  /**
   * @param params - plugin configuration and dependencies
   * @param params.config - EditorJS configuration
   * @param params.api - EditorAPI instance for block and selection access
   * @param params.eventBus - EventBus for event subscriptions
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
      if (selectedBlocks.length === 0) {
        return;
      }

      const currentDOMSelection = window.getSelection();

      if (!currentDOMSelection) {
        return;
      }

      const { clipboardData } = nativeEvent;

      /**
       * Fall back to native copy behavior if the browser doesn't provide clipboard access
       */
      if (!clipboardData) {
        return;
      }

      const selectionAsPlainText = currentDOMSelection.toString();
      const selectionAsHTML = this.#parseDOMSelectionToHTML(currentDOMSelection);
      const clipboardEditorJSObject = this.#createClipboardObject(selectedBlocks);

      nativeEvent.preventDefault();

      clipboardData.setData('text/plain', selectionAsPlainText);
      clipboardData.setData('text/html', selectionAsHTML);
      clipboardData.setData(EDITOR_JS_CLIPBOARD_MIME_TYPE, JSON.stringify(clipboardEditorJSObject));
    }, { signal: this.#controller.signal });
  }

  /**
   * Destroys the plugin and removes all event listeners
   */
  public destroy(): void {
    this.#controller.abort();
  }

  /**
   * Parses DOM selection to HTML string
   * @internal
   * @param selection - DOM selection to parse
   * @returns HTML string representation of the selection
   */
  #parseDOMSelectionToHTML(selection: Selection): string {
    if (selection.rangeCount === 0) {
      return '';
    }

    const template = document.createElement('template');

    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i);

      template.content.appendChild(range.cloneContents());
    }

    return template.innerHTML;
  }

  /**
   * Creates representation of copied from EditorJS data as an object
   * @internal
   * @param blocks - content to create a clipboard object
   */
  #createClipboardObject(blocks: BlockData[] = []): ClipboardEditorJSObject {
    return { blocks };
  }
}
