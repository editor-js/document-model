import 'reflect-metadata';
import { Service } from 'typedi';
import { BlockToolFacade } from '../../tools/facades/index.js';
import { make } from '@editorjs/dom';
import { CoreEventType, EventBus, ToolLoadedCoreEvent } from '../../components/EventBus/index.js';
import { ToolboxRenderedUIEvent } from './ToolboxRenderedUIEvent.js';
import { EditorAPI } from '../../api/index.js';
import { CoreConfigValidated } from '../../entities/Config.js';

/**
 * UI module responsible for rendering the toolbox
 *  - renders tool buttons in the toolbox
 *  - listens to the click event on the tool buttons to insert blocks
 */
@Service()
export class ToolboxUI {
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
   * @todo - unify the constructor parameters with the other UI plugins
   * @param _config - EditorJS validated configuration, not used here
   * @param api - EditorAPI instance to insert blocks
   * @param eventBus - EventBus instance to exchange events between components
   */
  constructor(
    _config: CoreConfigValidated,
    api: EditorAPI,
    eventBus: EventBus
  ) {
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
   * Renders Toolbox UI and dispatches an event
   */
  #render(): void {
    this.#nodes.holder = make('div');

    this.#nodes.holder.style.display = 'flex';

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
