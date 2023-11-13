import type { EventAction } from '../types/EventAction.js';
import type { BlockNodeSerialized } from '../../../entities/BlockNode/types/index.js';
import type { EventPayloadBase } from '../types/EventPayloadBase.js';
import type { BlockIndex } from '../types/indexing.js';
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
   * @param payload - The event payload
   */
  constructor(payload: BlockRemovedEventPayload) {
    // Stryker disable next-line ObjectLiteral
    super(EventType.Changed, { detail: payload });
  }
}
