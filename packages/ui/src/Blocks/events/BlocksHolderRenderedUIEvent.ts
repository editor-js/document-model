import { BlocksBaseEvent } from './BlocksBaseEvent.js';

/**
 * Payload of the BlocksHolderRenderedUIEvent
 * Contains Blocks holder HTML element
 */
export interface BlocksHolderRenderedUIEventPayload {
  /**
   * Blocks holder HTML element
   */
  readonly blocksHolder: HTMLElement;
}

/**
 * Class for events that is being fired after the blocks holder is rendered
 */
export class BlocksHolderRenderedUIEvent extends BlocksBaseEvent<BlocksHolderRenderedUIEventPayload> {
  /**
   * BlocksHolderRenderedUIEvent constructor function
   * @param payload - BlocksHolderRendered events payload
   */
  constructor(payload: BlocksHolderRenderedUIEventPayload) {
    super('rendered', payload);
  }
}
