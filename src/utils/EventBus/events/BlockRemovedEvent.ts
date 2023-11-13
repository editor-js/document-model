import { EventAction } from '../types/EventAction';
import { BlockNodeSerialized } from '../../../entities/BlockNode/types';
import { EventPayloadBase } from '../types/EventPayloadBase';
import { BlockIndex } from '../types/indexing';
import { EventType } from '../types/EventType';

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
   * @param payload - The event payload
   */
  constructor(payload: BlockRemovedEventPayload) {
    super(EventType.CHANGED, { detail: payload });
  }
}
