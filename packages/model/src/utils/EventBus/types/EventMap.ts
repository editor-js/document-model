import type { EventType } from './EventType';
import type { BlockAddedEvent } from '../events/BlockAddedEvent';
import type { BlockModifiedEvent } from '../events/BlockModifiedEvent';
import type { BlockRemovedEvent } from '../events/BlockRemovedEvent';
import type { TextInsertedEvent } from '../events/TextInsertedEvent';
import type { TextRemovedEvent } from '../events/TextRemovedEvent';
import type { TextFormattedEvent } from '../events/TextFormattedEvent';
import type { TextUnformattedEvent } from '../events/TextUnformattedEvent';
import type { ValueUpdatedEvent } from '../events/ValueUpdatedEvent';
import type { TuneUpdatedEvent } from '../events/TuneUpdatedEvent';

/**
 * Alias for all block events
 */
export type BlockEvents = BlockAddedEvent | BlockModifiedEvent | BlockRemovedEvent;

export type TextNodeEvents = TextInsertedEvent | TextRemovedEvent | TextFormattedEvent | TextUnformattedEvent;

export type ValueNodeEvents = ValueUpdatedEvent;

export type BlockTuneEvents = TuneUpdatedEvent;

/**
 * Map of all events that can be emitted inside the DocumentModel
 */
export type EventMap = {
  [EventType.Changed]: BlockEvents | TextNodeEvents | ValueNodeEvents | BlockTuneEvents;
};
