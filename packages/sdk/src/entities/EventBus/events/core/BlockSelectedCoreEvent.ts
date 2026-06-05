import type { BlockTune as IBlockTune } from '@/entities/BlockTune.js';
import type { BlockId } from '@editorjs/model';
import { CoreEventBase } from './CoreEventBase.js';
import { CoreEventType } from './CoreEventType.js';

/**
 * Payload of BlockSelectedCoreEvent custom event
 */
export interface BlockSelectedCoreEventPayload {
  /**
   * Index of the selected block
   */
  readonly index: number;

  /**
   * BlockId of the selected block
   */
  readonly blockId: BlockId | undefined;

  /**
   * Tune instances available for the selected block, keyed by tune name
   */
  readonly availableBlockTunes: Map<string, IBlockTune>;
}

/**
 * Event fired when a block is selected and its tune instances are ready for rendering
 */
export class BlockSelectedCoreEvent extends CoreEventBase<BlockSelectedCoreEventPayload> {
  /**
   * BlockSelectedCoreEvent constructor function
   * @param payload - event payload with block index, id, and tune instances
   */
  constructor(payload: BlockSelectedCoreEventPayload) {
    super(CoreEventType.BlockSelected, payload);
  }
}
