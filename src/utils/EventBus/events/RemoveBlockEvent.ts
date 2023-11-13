import { EventAction } from '../types/EventAction';
import { BlockNodeSerialized } from '../../../entities/BlockNode/types';
import { EventPayloadBase } from '../types/EventPayloadBase';
import { BlockIndex } from '../types/indexing';
import { EventType } from '../types/EventType';

/**
 * Remove Block Event Payload
 */
interface RemoveBlockEventPayload extends EventPayloadBase<BlockIndex, EventAction.Removed> {
  /**
   * The data of the removed block
   */
  data: BlockNodeSerialized;
}

/**
 * Remove Block Custom Event
 */
export class RemoveBlockEvent extends CustomEvent<RemoveBlockEventPayload> {
  /**
   * Constructor
   *
   * @param payload - The event payload
   */
  constructor(payload: RemoveBlockEventPayload) {
    super(EventType.CHANGED, { detail: payload });
  }
}
