import 'reflect-metadata';
import { Service } from 'typedi';
import ToolsManager from '../tools/ToolsManager.js';
import { ToolboxUI } from '../ui/Toolbox/index.js';

@Service()
export class Toolbox {
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
