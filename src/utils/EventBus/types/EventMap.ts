import { EventType } from './EventType';
import { AddBlockEvent } from '../events/AddBlockEvent';
import { ModifyBlockEvent } from '../events/ModifyBlockEvent';
import { RemoveBlockEvent } from '../events/RemoveBlockEvent';

/**
 * Alias for all block events
 */
type BlockEvents = AddBlockEvent | ModifyBlockEvent | RemoveBlockEvent;

/**
 * Map of all events that can be emitted inside the DocumentModel
 */
export type EventMap = {
  [EventType.CHANGED]: BlockEvents;
};
