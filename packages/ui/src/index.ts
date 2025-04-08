import { CoreConfigValidated, EventBus, EditorjsPlugin, EditorjsPluginParams } from '@editorjs/core';
import { ToolboxRenderedUIEvent } from './Toolbox/ToolboxRenderedUIEvent.js';
import { InlineToolbarRenderedUIEvent } from './InlineToolbar/InlineToolbarRenderedUIEvent.js';

/**
 * EditorJS UI plugin
 */
export class EditorjsUI implements EditorjsPlugin {
  /**
   * Editor configuration
   */
  #config: CoreConfigValidated;

  /**
   * Core event bus
   */
  #eventBus: EventBus;

  /**
   * Element where the editor is initited
   */
  #holder: HTMLElement;

  /**
   * Plugin type
   */
  public static type = 'editorjs-ui';

  /**
   * @param params - Plugin parameters
   */
  constructor(params: EditorjsPluginParams) {
    this.#config = params.config;
    this.#eventBus = params.eventBus;
    this.#holder = params.config.holder;

    this.#eventBus.addEventListener(`ui:toolbox:rendered`, (event: ToolboxRenderedUIEvent) => {
      this.#addToolbox(event.detail.toolbox);
    });

    this.#eventBus.addEventListener(`ui:inline-toolbar:rendered`, (event: InlineToolbarRenderedUIEvent) => {
      this.#addInlineToolbar(event.detail.toolbar);
    });
  }

  /**
   * Method to destroy the plugin
   */
  public destroy(): void {
    // Cleanup if needed
  }

  /**
   * Adds toolbox to the editor UI
   * @param toolboxElement - toolbox HTML element to add to the page
   */
  #addToolbox(toolboxElement: HTMLElement): void {
    this.#holder.appendChild(toolboxElement);
  }

  /**
   * Adds inline toolbar to the editor UI
   * @param toolbarElement - inline toolbar HTML element to add to the page
   */
  #addInlineToolbar(toolbarElement: HTMLElement): void {
    this.#holder.appendChild(toolbarElement);
  }
}

export * from './InlineToolbar/InlineToolbar.js';
export * from './Blocks/Blocks.js';
export * from './Toolbox/Toolbox.js';
