import type { BlockToolData } from '@editorjs/editorjs';
import { CoreEventBase } from './CoreEventBase.js';
import { CoreEventType } from './CoreEventType.js';

/**
 * Payload of BlockAddedCoreEvent custom event
 * Contains added block data: name, data, index and UI content to be rendered on tha page
 * @template UiContent - type of the UI content
 */
export interface BlockAddedCoreEventPayload<UiContent = unknown> {
  /**
   * Name of the added Block Tool
   */
  readonly tool: string;
  /**
   * Added Block data
   */
  readonly data: BlockToolData;
  /**
   * UI content to be rendered on the page
   */
  readonly uiContent: UiContent;
  /**
   * Index of the added Block
   */
  readonly index: number;
}

/**
 * Class for event that is being fired after the block is added
 */
export class BlockAddedCoreEvent<UiContent = unknown> extends CoreEventBase<BlockAddedCoreEventPayload<UiContent>> {
  /**
   * BlockAddedCoreEvent constructor function
   * @param payload - BlockAdded event payload with tool name, block data, index and UI content
   */
  constructor(payload: BlockAddedCoreEventPayload<UiContent>) {
    super(CoreEventType.BlockAdded, payload);
  }
}
