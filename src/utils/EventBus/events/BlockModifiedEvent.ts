import { BlockNodeSerialized } from '../../../entities/BlockNode/types';
import { EventAction } from '../types/EventAction';
import { EventPayloadBase } from '../types/EventPayloadBase';
import { BlockIndex } from '../types/indexing';
import { EventType } from '../types/EventType';

/**
 * Modify Block Event Payload
 */
interface BlockModifiedEventPayload extends EventPayloadBase<BlockIndex, EventAction.Modified> {
  /**
   * The data of the modified block
   */
  data: BlockNodeSerialized;
}

/**
 * Modify Block Custom Event
 */
export class BlockModifiedEvent extends CustomEvent<BlockModifiedEventPayload> {
  /**
   * Constructor
   *
   * @param payload - The event payload
   */
  constructor(payload: BlockModifiedEventPayload) {
    super(EventType.CHANGED, { detail: payload });
  }
}
