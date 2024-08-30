import 'reflect-metadata';
import { Service } from 'typedi';
import { BlockToolFacade } from '../../tools/facades/index.js';
import { make } from '@editorjs/dom';
import { BlocksAPI } from '../../api/BlocksAPI.js';

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
   * Object with Toolbox HTML nodes
   */
  #nodes: Record<string, HTMLElement> = {};

  /**
   * ToolboxUI class constructor
   * @param blocksAPI - BlocksAPI instance to insert blocks
   */
  constructor(blocksAPI: BlocksAPI) {
    this.#blocksAPI = blocksAPI;
  }

  /**
   * Renders Toolbox UI
   * @returns Toolbox HTML element
   */
  public render(): HTMLElement {
    this.#nodes.holder = make('div');

    this.#nodes.holder.style.display = 'flex';

    return this.#nodes.holder;
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
