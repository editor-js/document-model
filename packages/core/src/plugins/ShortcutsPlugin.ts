import type { InlineToolName } from '@editorjs/model';
import type {
  BlockToolFacade,
  BlockTuneFacade,
  EditorAPI,
  EditorjsPlugin,
  EditorjsPluginParams,
  KeydownUIEvent,
  ToolLoadedCoreEvent
} from '@editorjs/sdk';
import {
  CoreEventType,
  KeydownUIEventName,
  matchKeyboardShortcut,
  PluginType
} from '@editorjs/sdk';

/**
 * Subscribes to tool-loaded events and registers keyboard shortcuts from merged tool `options`
 * (`shortcut` for inline tools; `shortcuts` map reserved for block tools / render overrides).
 * Applies formatting via `api.selection.applyInlineToolForCurrentSelection`.
 */
export class ShortcutsPlugin implements EditorjsPlugin {
  /**
   * Registers with `core.use` under {@link PluginType.Plugin} (same id as Typedi multi-registration).
   */
  public static readonly type = PluginType.Plugin;

  /**
   * Shortcut string (Editor.js codex) → inline tool name from config (e.g. `bold`).
   */
  readonly #shortcutToToolName = new Map<string, string>();

  /**
   * API instance
   */
  readonly #api: EditorAPI;

  /**
   * @param params - {@link EditorjsPluginParams}
   */
  constructor(params: EditorjsPluginParams) {
    const { eventBus, api } = params;

    this.#api = api;

    eventBus.addEventListener(`core:${CoreEventType.ToolLoaded}`, (event: Event) => {
      const { detail } = event as ToolLoadedCoreEvent;
      const { tool } = detail;

      const shortcut = tool.options['shortcut'];

      if (typeof shortcut === 'string') {
        this.#shortcutToToolName.set(shortcut, tool.name);
      }

      /**
       * @todo support for "shortcuts" map for block tools / render overrides
       * @example
       * core.use(ListTool, {
       *   shortcuts: {
       *     'CMD+U': { style: 'ul'},
       *     'CMD+O': { style: 'ol'},
       *   }
       * })
       */
    });

    eventBus.addEventListener(`ui:${KeydownUIEventName}`, (event: Event) => {
      const { detail } = event as KeydownUIEvent;
      const { nativeEvent } = detail;

      if (nativeEvent.isComposing) {
        return;
      }

      for (const [shortcut, toolName] of this.#shortcutToToolName) {
        if (matchKeyboardShortcut(nativeEvent, shortcut)) {
          nativeEvent.preventDefault();

          try {
            this.#processInlineTool(toolName);
          } catch {
            /**
             * No caret in text input (e.g. focus outside) — ignore
             */
          }

          return;
        }
      }
    });
  }

  /**
   * Destroys the plugin
   */
  public destroy(): void {
    this.#shortcutToToolName.clear();
  }

  /**
   * Registers `shortcut` from merged inline tool `options` (Editor.js codex string, e.g. CMD+B).
   * @param toolName - name of the inline tool to apply
   */
  #processInlineTool(toolName: string): void {
    try {
      this.#api.selection.applyInlineToolForCurrentSelection(toolName as InlineToolName);
    } catch {
      /**
       * No caret in text input (e.g. focus outside) — ignore
       */
    }
  }

  /**
   * Block tool keyboard shortcuts (e.g. list styles) — reserved for future `shortcuts` in options.
   * @param _tool - loaded block tool facade
   */
  #processBlockTool(_tool: BlockToolFacade): void {
    /*
     * @todo `shortcuts` map for block tools (e.g. list styles) — apply render/data overrides
     */
  }

  /**
   * Block tune shortcuts — reserved for future use.
   * @param _tool - loaded block tune facade
   */
  #processBlockTune(_tool: BlockTuneFacade): void {
    /*
     * @todo block tune shortcuts if needed
     */
  }
}
