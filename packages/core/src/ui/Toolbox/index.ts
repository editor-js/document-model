import 'reflect-metadata';
import { Service } from 'typedi';
import { BlockToolFacade } from '../../tools/facades/index.js';
import { make } from '@editorjs/dom';
import { BlocksAPI } from '../../api/BlocksAPI.js';
import { CoreEventType, EventBus, ToolLoadedCoreEvent } from '../../components/EventBus/index.js';
import { ToolboxRenderedUIEvent } from './ToolboxRenderedUIEvent.js';

/**
 * UI module responsible for rendering the toolbox
 *  - renders tool buttons in the toolbox
 *  - listens to the click event on the tool buttons to insert blocks
 */
@Service()
export class ToolboxUI {
  /**
   * BlocksAPI instance to insert blocks
   * @todo replace with the full Editor API
   */
  #blocksAPI: BlocksAPI;

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
   * @param blocksAPI - BlocksAPI instance to insert blocks
   * @param eventBus - EventBus instance to exchange events between components
   */
  constructor(blocksAPI: BlocksAPI, eventBus: EventBus) {
    this.#blocksAPI = blocksAPI;
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
      void this.#blocksAPI.insert(tool.name);
    });

    this.#nodes.holder.appendChild(toolButton);
  }
}

export * from './ToolboxRenderedUIEvent.js';
