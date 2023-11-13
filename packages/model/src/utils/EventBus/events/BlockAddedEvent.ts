import type { BlockNodeSerialized } from '../../../entities/BlockNode/types';
import type { EventAction } from '../types/EventAction';
import type { EventPayloadBase } from '../types/EventPayloadBase';
import type { BlockIndex } from '../types/indexing';
import { EventType } from '../types/EventType';

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
   */
  constructor(payload: BlockAddedEventPayload) {
    // Stryker disable next-line ObjectLiteral
    super(EventType.Changed, { detail: payload });
  }
}
