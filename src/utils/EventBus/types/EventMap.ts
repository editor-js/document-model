import type { EventType } from './EventType.js';
import type { BlockAddedEvent } from '../events/BlockAddedEvent.js';
import type { BlockModifiedEvent } from '../events/BlockModifiedEvent.js';
import type { BlockRemovedEvent } from '../events/BlockRemovedEvent.js';

/**
 * Alias for all block events
 */
type BlockEvents = BlockAddedEvent | BlockModifiedEvent | BlockRemovedEvent;

/**
 * Map of all events that can be emitted inside the DocumentModel
 */
export type EventMap = {
  [EventType.Changed]: BlockEvents;
};
