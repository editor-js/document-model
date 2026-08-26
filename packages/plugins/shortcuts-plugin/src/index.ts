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
  IndexError,
  KeydownUIEventName,
  matchKeyboardShortcut,
  PluginType
} from '@editorjs/sdk';

/**
 * Handler invoked when a registered shortcut is pressed
 */
export type ShortcutHandler = (event: KeyboardEvent) => void;

/**
 * Configuration a tool addresses to the Shortcuts plugin under `options.plugins.shortcuts`
 */
export interface ShortcutsToolOptions {
  /**
   * Keyboard shortcut string (Editor.js codex notation, e.g. `CMD+B`) that applies the tool
   */
  shortcut?: string;
}

/**
 * Public API the Shortcuts plugin exposes as `api.plugins.shortcuts`
 */
export interface ShortcutsPluginApi {
  /**
   * Binds a handler to a keyboard shortcut, replacing whatever was bound to it before
   * @param shortcut - shortcut string in Editor.js codex notation, e.g. `CMD+K`
   * @param handler - called with the native event when the shortcut is pressed
   */
  register(shortcut: string, handler: ShortcutHandler): void;

  /**
   * Removes whatever handler is bound to the given shortcut
   * @param shortcut - shortcut string in Editor.js codex notation
   */
  unregister(shortcut: string): void;
}

declare module '@editorjs/sdk' {
  /* eslint-disable jsdoc/require-jsdoc -- interface members are documented on the types they alias */
  interface EditorjsPluginApiMap {
    /**
     * Shortcuts plugin's public API
     */
    shortcuts: ShortcutsPluginApi;
  }

  interface ToolPluginOptionsMap {
    /**
     * Options tools address to the Shortcuts plugin
     */
    shortcuts: ShortcutsToolOptions;
  }
  /* eslint-enable jsdoc/require-jsdoc */
}

/**
 * Subscribes to tool-loaded events and registers keyboard shortcuts declared by tools under
 * `options.plugins.shortcuts`, and exposes {@link ShortcutsPluginApi} for registering shortcuts
 * at runtime. Tool-declared and API-registered shortcuts share one table, so one shortcut always
 * resolves to exactly one handler.
 */
export class ShortcutsPlugin implements EditorjsPlugin<'shortcuts'> {
  /**
   * Registers with `core.use` under {@link PluginType.Plugin} (same id as Typedi multi-registration).
   */
  public static readonly type = PluginType.Plugin;

  /**
   * Plugin name — keys both `api.plugins.shortcuts` and `options.plugins.shortcuts`.
   */
  public static readonly name = 'shortcuts';

  /**
   * Shortcut string (Editor.js codex) → handler invoked when it is pressed.
   */
  readonly #handlers = new Map<string, ShortcutHandler>();

  /**
   * API instance
   */
  readonly #api: EditorAPI;

  /**
   * API exposed to the integrator and to other plugins
   */
  public readonly publicApi: ShortcutsPluginApi = {
    /**
     * Binds a handler to a shortcut, replacing any handler bound to it before
     * @param shortcut - shortcut string in Editor.js codex notation
     * @param handler - called with the native event when the shortcut is pressed
     */
    register: (shortcut, handler) => {
      this.#handlers.set(shortcut, handler);
    },
    /**
     * Removes whatever handler is bound to the given shortcut
     * @param shortcut - shortcut string in Editor.js codex notation
     */
    unregister: (shortcut) => {
      this.#handlers.delete(shortcut);
    },
  };

  /**
   * @param params - {@link EditorjsPluginParams}
   */
  constructor(params: EditorjsPluginParams) {
    const { eventBus, api } = params;

    this.#api = api;

    eventBus.addEventListener(`core:${CoreEventType.ToolLoaded}`, (event: Event) => {
      const { detail } = event as ToolLoadedCoreEvent;
      const { tool } = detail;

      const { shortcut } = tool.pluginOptions(ShortcutsPlugin.name) ?? {};

      if (shortcut !== undefined) {
        this.publicApi.register(shortcut, () => this.#processInlineTool(tool.name));
      }

      /**
       * @todo support for "shortcuts" map for block tools / render overrides
       * @example
       * core.use(ListTool, {
       *   plugins: {
       *     shortcuts: {
       *       shortcuts: {
       *         'CMD+U': { style: 'ul'},
       *         'CMD+O': { style: 'ol'},
       *       },
       *     },
       *   },
       * })
       */
    });

    eventBus.addEventListener(`ui:${KeydownUIEventName}`, (event: Event) => {
      const { detail } = event as KeydownUIEvent;
      const { nativeEvent } = detail;

      if (nativeEvent.isComposing === true) {
        return;
      }

      for (const [shortcut, handler] of this.#handlers) {
        if (matchKeyboardShortcut(nativeEvent, shortcut) === true) {
          nativeEvent.preventDefault();

          handler(nativeEvent);

          return;
        }
      }
    });
  }

  /**
   * Destroys the plugin
   */
  public destroy(): void {
    this.#handlers.clear();
  }

  /**
   * Registers `shortcut` from merged inline tool `options` (Editor.js codex string, e.g. CMD+B).
   * @param toolName - name of the inline tool to apply
   */
  #processInlineTool(toolName: string): void {
    try {
      this.#api.selection.applyInlineTool({ tool: toolName });
    } catch (error) {
      if (error instanceof IndexError) {
        /**
         * No caret in text input (e.g. focus outside) — ignore
         */
        return;
      }

      throw error;
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
