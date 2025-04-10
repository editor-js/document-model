/* eslint-disable @typescript-eslint/naming-convention */
import type { BlockToolData } from '@editorjs/editorjs';
import { CoreEventBase } from './CoreEventBase.js';
import { CoreEventType } from './CoreEventType.js';

/**
 * Payload of BlockAddedCoreEvent custom event
 * Contains added block data: name, data, index and UI content to be rendered on tha page
 * @template UI - type of the UI content
 */
export interface BlockAddedCoreEventPayload<UI = unknown> {
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
  readonly ui: UI;
  /**
   * Index of the added Block
   */
  readonly index: number;
}

/**
 * Class for event that is being fired after the block is added
 */
export class BlockAddedCoreEvent<UI = unknown> extends CoreEventBase<BlockAddedCoreEventPayload<UI>> {
  /**
   * BlockAddedCoreEvent constructor function
   * @param payload - BlockAdded event payload with tool name, block data, index and UI content
   */
  constructor(payload: BlockAddedCoreEventPayload<UI>) {
    super(CoreEventType.BlockAdded, payload);
  }
}
