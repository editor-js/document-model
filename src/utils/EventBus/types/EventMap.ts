import { EventType } from './EventType.js';
import { BlockAddedEvent } from '../events/BlockAddedEvent.js';
import { BlockModifiedEvent } from '../events/BlockModifiedEvent.js';
import { BlockRemovedEvent } from '../events/BlockRemovedEvent.js';

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
