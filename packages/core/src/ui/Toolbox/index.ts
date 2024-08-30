import 'reflect-metadata';
import { Service } from 'typedi';
import { BlockToolFacade } from '../../tools/facades/index.js';
import { make } from '@editorjs/dom';
import { BlocksAPI } from '../../api/BlocksAPI.js';

@Service()
export class ToolboxUI {
  #blocksAPI: BlocksAPI;

  constructor(blocksAPI: BlocksAPI) {
    this.#blocksAPI = blocksAPI;
  }

  #nodes: Record<string, HTMLElement> = {};

  render(): HTMLElement {
    this.#nodes.holder = make('div');

    this.#nodes.holder.style.display = 'flex';

    return this.#nodes.holder;
  }

  addTool(tool: BlockToolFacade) {
    const toolButton = make('button');

    toolButton.textContent = tool.name;

    toolButton.addEventListener('click', () => {
      void this.#blocksAPI.insert(tool.name);
    });

    this.#nodes.holder.appendChild(toolButton);
  }
}
