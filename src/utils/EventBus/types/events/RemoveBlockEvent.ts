import { EventType } from '../EventType';
import { BlockNodeSerialized } from '../../../../entities/BlockNode/types';
import { DocumentModelEventPayload } from './DocumentModelEventPayload';
import { BlockIndex } from '../indexation';

export const REMOVE_BLOCK_EVENT = 'remove-block';

/**
 * Remove Block Event Payload
 */
interface RemoveBlockEventPayload extends DocumentModelEventPayload<BlockIndex, EventType.Removed> {
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
    super(REMOVE_BLOCK_EVENT, { detail: payload });
  }
}
