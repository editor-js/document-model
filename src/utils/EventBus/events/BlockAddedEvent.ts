import type { BlockNodeSerialized } from '../../../entities/BlockNode/types/index.js';
import type { EventAction } from '../types/EventAction.js';
import type { EventPayloadBase } from '../types/EventPayloadBase.js';
import type { BlockIndex } from '../types/indexing.js';
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
   */
  constructor(payload: BlockAddedEventPayload) {
    super(EventType.Changed, { detail: payload });
  }
}
