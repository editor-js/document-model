import { BlocksBaseEvent } from './BlocksBaseEvent.js';

/**
 * Payload of the BlocksHolderRenderedUIEvent
 * Contains Blocks holder HTML element
 */
export interface BlocksHolderRenderedUIEventPayload {
  /**
   * Blocks holder HTML element
   */
  readonly blocks: HTMLElement;
}

/**
 * Class for events that is being fired after the inline toolbar is rendered
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
