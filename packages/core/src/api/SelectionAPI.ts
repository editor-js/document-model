import 'reflect-metadata';
import { Service } from 'typedi';

import { SelectionManager } from '../components/SelectionManager.js';
import { createInlineToolName } from '@editorjs/model';
import { InlineToolFormatData } from '@editorjs/sdk';

/**
 * Selection API class
 * - provides methods to work with selection
 */
@Service()
export class SelectionAPI {
  #selectionManager: SelectionManager;

  constructor(
    selectionManager: SelectionManager
  ) {
    this.#selectionManager = selectionManager;
  };

  /**
   * Applies passed inline tool to the current selection
   * @param toolName - Inline Tool name from the config to apply on the current selection
   * @param data - Inline Tool data to apply to the current selection (eg. link data)
   */
  public applyInlineToolForCurrentSelection(toolName: string, data?: InlineToolFormatData): void {
    this.#selectionManager.applyInlineToolForCurrentSelection(createInlineToolName(toolName), data);
  }
}
