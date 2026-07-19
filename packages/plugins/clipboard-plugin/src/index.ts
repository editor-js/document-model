import type { BlockData, CopyUIEvent, EditorAPI, EditorjsPlugin, EditorjsPluginParams, EventBus } from '@editorjs/sdk';
import { CopyUIEventName } from '@editorjs/sdk';
import { PluginType } from '@editorjs/sdk';

/**
 * Clipboard plugin handles copy events and provides rich clipboard data for selected blocks.
 * When a user copies content, this plugin intercepts the event and adds EditorJS-specific data
 * including the selected blocks metadata alongside plain text and HTML content.
 */
export class ClipboardPlugin implements EditorjsPlugin {
  public static readonly type = PluginType.Plugin;

  readonly #api: EditorAPI;
  readonly #eventBus: EventBus;
  #copyEventListener: ((e: CopyUIEvent) => void) | undefined;

  /**
   * @param params - plugin configuration and dependencies
   * @param params.config - EditorJS configuration
   * @param params.api - EditorAPI instance for block and selection access
   * @param params.eventBus - EventBus for event subscriptions
   */
  constructor(params: EditorjsPluginParams) {
    const { api, eventBus } = params;

    this.#api = api;
    this.#eventBus = eventBus;

    this.#copyEventListener = (e: CopyUIEvent) => {
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

      const selectionAsPlainText = currentDOMSelection.toString();
      const selectionAsHTML = this.#parseDOMSelectionToHTML(currentDOMSelection);
      const clipboardEditorJSObject = this.#createClipboardObject(selectedBlocks);

      nativeEvent.preventDefault();

      nativeEvent.clipboardData?.setData('text/plain', selectionAsPlainText);
      nativeEvent.clipboardData?.setData('text/html', selectionAsHTML);
      nativeEvent.clipboardData?.setData('application/x-editor-js', JSON.stringify(clipboardEditorJSObject));
    };

    eventBus.addEventListener(`ui:${CopyUIEventName}`, this.#copyEventListener);
  }

  /**
   * Destroys the plugin and removes all event listeners
   */
  public destroy(): void {
    this.#removeEventListener();
  }

  /**
   * Removes the event listener for copy events
   * @internal
   */
  #removeEventListener(): void {
    if (this.#copyEventListener !== undefined) {
      this.#eventBus.removeEventListener(`ui:${CopyUIEventName}`, this.#copyEventListener);
    }
    this.#copyEventListener = undefined;
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
   * Creates representation of copied from EditorJS data as an object with metadata
   * @internal
   * @param blocks - content to create a clipboard object
   */
  #createClipboardObject(blocks: BlockData[] = []): ClipboardEditorJSObject {
    return {
      blocks,
      meta: {
        // @todo get version info from Core
        version: '3.0.0',
      },
    };
  }
}

/**
 * Custom EditorJS data-type object for clipboard events
 */
interface ClipboardEditorJSObject {
  /**
   * Array of copied blocks data
   */
  blocks: BlockData[];

  /**
   * Metadata from EditorJS
   */
  meta: Meta;
}

/**
 * Metadata from EditorJS
 */
interface Meta {
  /**
   * Version of EditorJS Core
   */
  version: string;
}
