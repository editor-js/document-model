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
      console.log('Copied to clipboard plugin', e.detail);
    });
  }

  /**
   * @todo update doc
   */
  public destroy(): void {
    // do nothing
  }
}
