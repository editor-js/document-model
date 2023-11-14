import type { BlockNodeSerialized } from '../../../entities/BlockNode/types';
import { EventAction } from '../types/EventAction.js';
import type { EventPayloadBase } from '../types/EventPayloadBase';
import type { BlockIndex } from '../types/indexing';
import { EventType } from '../types/EventType.js';

/**
 * Add Block Event Payload
 */
interface BlockAddedEventPayload extends EventPayloadBase<BlockIndex, EventAction.Added> {
  /**
   * The data of the added block
   */
  data: BlockNodeSerialized;
}

/**
 * Add Block Custom Event
 */
export class BlockAddedEvent extends CustomEvent<BlockAddedEventPayload> {
  /**
   * Constructor
   *
   * @param payload - The event payload
   * @param index
   * @param data
   */
  constructor(index: BlockIndex, data: BlockNodeSerialized) {
    // Stryker disable next-line ObjectLiteral
    super(EventType.Changed, {
      detail: {
        action: EventAction.Added,
        index,
        data,
      },
    });
  }
}
