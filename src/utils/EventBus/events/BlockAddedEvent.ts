import { BlockNodeSerialized } from '../../../entities/BlockNode/types';
import { EventAction } from '../types/EventAction';
import { EventPayloadBase } from '../types/EventPayloadBase';
import { BlockIndex } from '../types/indexing';
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
    super(EventType.CHANGED, { detail: payload });
  }
}
