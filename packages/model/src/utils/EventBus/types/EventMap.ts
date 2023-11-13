import type { EventType } from './EventType';
import type { BlockAddedEvent } from '../events/BlockAddedEvent';
import type { BlockModifiedEvent } from '../events/BlockModifiedEvent';
import type { BlockRemovedEvent } from '../events/BlockRemovedEvent';

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
