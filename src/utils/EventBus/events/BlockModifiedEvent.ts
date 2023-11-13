import type { BlockNodeSerialized } from '../../../entities/BlockNode/types/index.js';
import type { EventAction } from '../types/EventAction.js';
import type { EventPayloadBase } from '../types/EventPayloadBase.js';
import type { BlockIndex } from '../types/indexing.js';
import { EventType } from '../types/EventType.js';

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
    super(EventType.Changed, { detail: payload });
  }
}
