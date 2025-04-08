import { make } from '@editorjs/dom';
import { 
  CoreEventType, 
  EventBus, 
  ToolLoadedCoreEvent, 
  BlockToolFacade, 
  EditorjsPlugin, 
  EditorjsPluginParams 
} from '@editorjs/core';
import { ToolboxRenderedUIEvent } from './ToolboxRenderedUIEvent.js';
import { EditorAPI } from '@editorjs/core';

/**
 * UI module responsible for rendering the toolbox
 *  - renders tool buttons in the toolbox
 *  - listens to the click event on the tool buttons to insert blocks
 */
export class ToolboxUI implements EditorjsPlugin {
  /**
   * Plugin type
   */
  public static readonly type = 'toolbox';

  /**
   * EditorAPI instance to insert blocks
   */
  #api: EditorAPI;

  /**
   * EventBus instance to exchange events between components
   */
  #eventBus: EventBus;

  /**
   * Object with Toolbox HTML nodes
   */
  #nodes: Record<string, HTMLElement> = {};

  /**
   * ToolboxUI class constructor
   * @param config - EditorJS validated configuration
   * @param api - EditorAPI instance to insert blocks
   * @param eventBus - EventBus instance to exchange events between components
   */
  constructor({
    api,
    eventBus
  }: EditorjsPluginParams) {
    this.#api = api;
    this.#eventBus = eventBus;

    this.#render();

    this.#eventBus.addEventListener(`core:${CoreEventType.ToolLoaded}`, (event: ToolLoadedCoreEvent) => {
      const { tool } = event.detail;

      if (tool.isBlock()) {
        this.addTool(tool);
      }
    });
  }

  /**
   * Cleanup when plugin is destroyed
   */
  public destroy(): void {
    this.#nodes.holder?.remove();
  }

  /**
   * Renders Toolbox UI and dispatches an event
   */
  #render(): void {
    this.#nodes.holder = make('div');

    this.#nodes.holder.style.display = 'flex';
    this.#nodes.holder.style.marginBottom = '10px';

    this.#eventBus.dispatchEvent(new ToolboxRenderedUIEvent({
      toolbox: this.#nodes.holder,
    }));
  }

  /**
   * Renders tool button in the toolbox
   * @param tool - Block tool to add to the toolbox
   */
  public addTool(tool: BlockToolFacade): void {
    const toolButton = make('button');

    toolButton.textContent = tool.name;

    toolButton.addEventListener('click', () => {
      void this.#api.blocks.insert(tool.name);
    });

    this.#nodes.holder.appendChild(toolButton);
  }
}

export * from './ToolboxRenderedUIEvent.js';
