import { CoreEventBase } from './CoreEventBase.js';
import { CoreEventType } from './CoreEventType.js';

/**
 * Payload of BlockRemovedCoreEvent custom event
 */
export interface BlockRemovedCoreEventPayload {
  /**
   * Block Tool name
   */
  readonly tool: string;
  /**
   * Index of the removed block
   */
  readonly index: number;
}

/**
 * Class for event that is being fired after the block is removed
 */
export class BlockRemovedCoreEvent extends CoreEventBase<BlockRemovedCoreEventPayload> {
  /**
   * BlockRemovedCoreEvent constructor function
   * @param payload - BlockRemoved event payload with toola name and block index
   */
  constructor(payload: BlockRemovedCoreEventPayload) {
    super(CoreEventType.BlockRemoved, payload);
  }
}
