import { UIEventBase } from './UIEventBase.js';

/**
 * Payload of the BlockSelectedUIEvent
 * Contains index and element of the selected block
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
 * Event fired when a Block is selected in the UI (on mouseenter)
 */
export class BlockSelectedUIEvent extends UIEventBase<BlockSelectedUIEventPayload> {
  /**
   * BlockSelectedUIEvent constructor function
   * @param payload - BlockSelectedUIEvent events payload
   */
  constructor(payload: BlockSelectedUIEventPayload) {
    super('blocks:block-selected', payload);
  }
}
