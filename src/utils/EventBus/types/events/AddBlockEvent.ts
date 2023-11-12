import { BlockNodeSerialized } from '../../../../entities/BlockNode/types';
import { EventType } from '../EventType';
import { DocumentModelEventPayload } from './DocumentModelEventPayload';
import { BlockIndex } from '../indexation';

export const ADD_BLOCK_EVENT = 'add-block';

/**
 * Add Block Event Payload
 */
interface AddBlockEventPayload extends DocumentModelEventPayload<BlockIndex, EventType.Added> {
  /**
   * The data of the added block
   */
  data: BlockNodeSerialized;
}

/**
 * Add Block Custom Event
 */
export class AddBlockEvent extends CustomEvent<AddBlockEventPayload> {
  /**
   * Constructor
   *
   * @param payload - The event payload
   */
  constructor(payload: AddBlockEventPayload) {
    super(ADD_BLOCK_EVENT, { detail: payload });
  }
}
