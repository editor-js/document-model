import 'reflect-metadata';
import { Service } from 'typedi';
import ToolsManager from '../tools/ToolsManager.js';
import { ToolboxUI } from '../ui/Toolbox/index.js';

/**
 * Class responsible for Toolbox business logic
 *  - calls ToolboxUI to render the tools buttons in the toolbox
 */
@Service()
export class Toolbox {
  /**
   * Toolbox class constructor, all parameters are injected through the IoC container
   * @param toolsManager - ToolsManager instance to get block tools
   * @param toolboxUI - ToolboxUI instance to render tools buttons in the toolbox
   */
  constructor(
    toolsManager: ToolsManager,
    toolboxUI: ToolboxUI
  ) {
    const blockTools = toolsManager.blockTools;

    blockTools.forEach((blockTool) => {
      toolboxUI.addTool(blockTool);
    });
  }
}
