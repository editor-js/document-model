import { EventAction } from '../types/EventAction.js';
import type { BlockNodeSerialized } from '../../../entities/BlockNode/types';
import type { EventPayloadBase } from '../types/EventPayloadBase';
import type { BlockIndex } from '../types/indexing';
import { EventType } from '../types/EventType.js';

/**
 * Remove Block Event Payload
 */
interface BlockRemovedEventPayload extends EventPayloadBase<BlockIndex, EventAction.Removed> {
  /**
   * The data of the removed block
   */
  data: BlockNodeSerialized;
}

/**
 * Remove Block Custom Event
 */
export class BlockRemovedEvent extends CustomEvent<BlockRemovedEventPayload> {
  /**
   * Constructor
   *
   * @param index
   * @param data
   */
  constructor(index: BlockIndex, data: BlockNodeSerialized) {
    // Stryker disable next-line ObjectLiteral
    super(EventType.Changed, {
      detail: {
        action: EventAction.Removed,
        index,
        data,
      },
    });
  }
}
