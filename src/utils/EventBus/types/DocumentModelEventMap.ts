import { ADD_BLOCK_EVENT, AddBlockEvent } from './events/AddBlockEvent';
import { REMOVE_BLOCK_EVENT, RemoveBlockEvent } from './events/RemoveBlockEvent';
import { MODIFY_BLOCK_EVENT, ModifyBlockEvent } from './events/ModifyBlockEvent';

/**
 * Map of all events that can be emitted inside the DocumentModel
 */
export type DocumentModelEventMap = {
  /* Block Events */
  [ADD_BLOCK_EVENT]: AddBlockEvent;
  [REMOVE_BLOCK_EVENT]: RemoveBlockEvent;
  [MODIFY_BLOCK_EVENT]: ModifyBlockEvent;
};
