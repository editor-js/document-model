import { BlockNodeSerialized } from '../../../../entities/BlockNode/types';
import { EventType } from '../EventType';
import { DocumentModelEventPayload } from './DocumentModelEventPayload';
import { BlockIndex } from '../indexation';

export const MODIFY_BLOCK_EVENT = 'modify-block';

/**
 * Modify Block Event Payload
 */
interface ModifyBlockEventPayload extends DocumentModelEventPayload<BlockIndex, EventType.Modified> {
  /**
   * The data of the modified block
   */
  data: BlockNodeSerialized;
}

/**
 * Modify Block Custom Event
 */
export class ModifyBlockEvent extends CustomEvent<ModifyBlockEventPayload> {
  /**
   * Constructor
   *
   * @param payload - The event payload
   */
  constructor(payload: ModifyBlockEventPayload) {
    super(MODIFY_BLOCK_EVENT, { detail: payload });
  }
}
