import Core from '@editorjs/core';
import type { CoreConfig, ToolConstructable } from '@editorjs/sdk';
import { DOMAdapters } from '@editorjs/dom-adapters';
import { CollaborationManager } from '@editorjs/collaboration-manager';
import { Paragraph } from '@editorjs/paragraph';
import { BoldInlineTool } from '@editorjs/bold';
import { ItalicInlineTool } from '@editorjs/italic';
import { LinkInlineTool } from '@editorjs/inline-link';
import { ClipboardPlugin } from '@editorjs/clipboard-plugin';
import { EditorjsUI, BlocksUI, InlineToolbarUI, ToolbarUI, ToolboxUI } from '@editorjs/ui';
import { mergeTools } from './mergeTools.js';

/**
 * Default tools registered by the bundle, keyed later by their static `name`.
 * A user tool of the same name replaces the corresponding default (override-by-name).
 */
const DEFAULT_TOOLS: ToolConstructable[] = [
  Paragraph,
  BoldInlineTool,
  ItalicInlineTool,
  LinkInlineTool,
];

/**
 * Configuration accepted by the {@link EditorJS} bundle.
 *
 * Mirrors {@link CoreConfig} but replaces the v2-shaped `tools` field with a v3
 * constructor map (`{ [name]: ToolConstructable }`) merged over the defaults.
 */
export type EditorJSConfig = Omit<CoreConfig, 'tools'> & {
  /**
   * User tools to register on top of the defaults. A tool provided under a name
   * that matches a default tool replaces that default instead of duplicating it.
   */
  tools?: Record<string, ToolConstructable>;
};

/**
 * Batteries-included Editor.js entry point.
 *
 * Composes {@link Core} with the default DOM adapter, collaboration, tools,
 * plugins, and UI, then auto-initializes. Await {@link EditorJS.isReady} to know
 * when the editor has finished booting.
 */
export default class EditorJS {
  /**
   * Underlying headless engine that this bundle composes.
   */
  readonly #core: Core;

  /**
   * Promise settled when initialization completes (resolves) or fails (rejects).
   */
  readonly #readyPromise: Promise<void>;

  /**
   * @param config - editor configuration; `config.tools` is merged over the defaults by name
   */
  constructor(config: EditorJSConfig) {
    const { tools, ...coreConfig } = config;

    this.#core = new Core(coreConfig as CoreConfig);

    /**
     * Infrastructure: rendering adapter and collaboration.
     */
    this.#core.use(DOMAdapters);
    this.#core.use(CollaborationManager);

    /**
     * Default plugins.
     */
    this.#core.use(ClipboardPlugin);

    /**
     * Default tools merged with user-provided `config.tools` (user wins by name).
     */
    for (const tool of mergeTools(DEFAULT_TOOLS, tools)) {
      this.#core.use(tool);
    }

    /**
     * Default UI.
     */
    this.#core.use(EditorjsUI);
    this.#core.use(BlocksUI);
    this.#core.use(InlineToolbarUI);
    this.#core.use(ToolbarUI);
    this.#core.use(ToolboxUI);

    this.#readyPromise = this.#core.initialize();
  }

  /**
   * Resolves once the editor has finished initializing; rejects if initialization fails.
   */
  public get isReady(): Promise<void> {
    return this.#readyPromise;
  }
}

export { Core };
export { Paragraph, BoldInlineTool, ItalicInlineTool, LinkInlineTool };
