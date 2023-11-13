import type { BlockNodeSerialized } from '../../../entities/BlockNode/types';
import type { EventAction } from '../types/EventAction';
import type { EventPayloadBase } from '../types/EventPayloadBase';
import type { BlockIndex } from '../types/indexing';
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
    // Stryker disable next-line ObjectLiteral
    super(EventType.Changed, { detail: payload });
  }
}
