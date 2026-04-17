import '@codexteam/ui/styles/themes/pure';
import '@codexteam/ui/styles/themes/sky';
import '@codexteam/ui/styles';

import type { EventBus,
  CoreConfigValidated,
  EditorjsPlugin,
  EditorjsPluginParams } from '@editorjs/sdk';
import {
  UiComponentType
} from '@editorjs/sdk';
import type { InlineToolbarRenderedUIEvent } from './InlineToolbar/InlineToolbarRenderedUIEvent.js';
import Style from './main.module.pcss';

import type { ToolbarRenderedUIEvent } from './Toolbar/ToolbarRenderedUIEvent.js';
import { make } from '@editorjs/dom';
import type { BlocksHolderRenderedUIEvent } from './Blocks/events/index.js';

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
   * Element where the editor is initiated
   */
  #holder: HTMLElement;

  /**
   * Additional wrapper so we don't mess with user provided one
   */
  #editorWrapper = make('div', Style.editor);

  /**
   * Plugin type
   */
  public static type = UiComponentType.Shell;

  /**
   * @param params - Plugin parameters
   */
  constructor(params: EditorjsPluginParams) {
    this.#config = params.config;
    this.#eventBus = params.eventBus;
    this.#holder = params.config.holder;

    this.#holder.append(this.#editorWrapper);

    this.#eventBus.addEventListener(`ui:toolbar:rendered`, (event: ToolbarRenderedUIEvent) => {
      this.#addToolbar(event.detail.toolbar);
    });

    this.#eventBus.addEventListener(`ui:inline-toolbar:rendered`, (event: InlineToolbarRenderedUIEvent) => {
      this.#addInlineToolbar(event.detail.toolbar);
    });

    this.#eventBus.addEventListener(`ui:blocks:rendered`, (event: BlocksHolderRenderedUIEvent) => {
      this.#addBlocks(event.detail.blocksHolder);
    });
  }

  /**
   * Method to destroy the plugin
   */
  public destroy(): void {
    // Cleanup if needed
  }

  /**
   * Adds toolbar to the editor UI
   * @param toolbarElement - toolbox HTML element to add to the page
   */
  #addToolbar(toolbarElement: HTMLElement): void {
    this.#editorWrapper.appendChild(toolbarElement);
  }

  /**
   * Adds inline toolbar to the editor UI
   * @param toolbarElement - inline toolbar HTML element to add to the page
   */
  #addInlineToolbar(toolbarElement: HTMLElement): void {
    this.#editorWrapper.appendChild(toolbarElement);
  }

  /**
   * Add blocks holder element to the UI
   * @param blocksElement -blocks  holder element
   */
  #addBlocks(blocksElement: HTMLElement): void {
    this.#editorWrapper.appendChild(blocksElement);
  }
}

export * from './InlineToolbar/InlineToolbar.js';
export * from './Blocks/Blocks.js';
export * from './Toolbox/Toolbox.js';
export * from './Toolbar/Toolbar.js';
