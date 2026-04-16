import { BlocksBaseEvent } from './BlocksBaseEvent.js';

/**
 * Payload of the BlockSelectedUIEvent
 * Contains index of a selected block
 */
export interface BlockSelectedUIEventPayload {
  /**
   * Block wrapper element
   */
  readonly block: HTMLElement;

  /**
   * Index of a selected block
   */
  readonly index: number;
}

/**
 * Class for events that is being fired when a Block is selected in the ui (on mouseenter event)
 */
export class BlockSelectedUIEvent extends BlocksBaseEvent<BlockSelectedUIEventPayload> {
  /**
   * BlockSelectedUIEvent constructor function
   * @param payload - BlockSelectedUIEvent events payload
   */
  constructor(payload: BlockSelectedUIEventPayload) {
    super('block-selected', payload);
  }
}
