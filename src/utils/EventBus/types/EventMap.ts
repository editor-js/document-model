import { EventType } from './EventType';
import { BlockAddedEvent } from '../events/BlockAddedEvent';
import { BlockModifiedEvent } from '../events/BlockModifiedEvent';
import { BlockRemovedEvent } from '../events/BlockRemovedEvent';

/**
 * Alias for all block events
 */
type BlockEvents = BlockAddedEvent | BlockModifiedEvent | BlockRemovedEvent;

/**
 * Map of all events that can be emitted inside the DocumentModel
 */
export type EventMap = {
  [EventType.CHANGED]: BlockEvents;
};
