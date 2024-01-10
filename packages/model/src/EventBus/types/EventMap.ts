import type { EventType } from './EventType.js';
import type {
  BlockAddedEvent,
  BlockRemovedEvent,
  TextAddedEvent,
  TextRemovedEvent,
  TextUnformattedEvent,
  TextFormattedEvent,
  ValueModifiedEvent,
  TuneModifiedEvent,
  PropertyModifiedEvent,
  CaretManagerCaretUpdatedEvent
} from '../events/index.js';
import type { CaretManagerCaretAddedEvent, CaretManagerCaretRemovedEvent } from '../events/index.js';

export { CaretManagerCaretUpdatedEvent };

/**
 * Alias for all block events
 */
export type BlockEvents = BlockAddedEvent | BlockRemovedEvent;

export type TextNodeEvents = TextAddedEvent | TextRemovedEvent | TextFormattedEvent | TextUnformattedEvent;

export type ValueNodeEvents = ValueModifiedEvent;

export type BlockTuneEvents = TuneModifiedEvent;

export type DocumentEvents = PropertyModifiedEvent;

export type ModelEvents = BlockEvents | TextNodeEvents | ValueNodeEvents | BlockTuneEvents | DocumentEvents;

export type CaretManagerEvents = CaretManagerCaretAddedEvent | CaretManagerCaretUpdatedEvent | CaretManagerCaretRemovedEvent;

/**
 * Map of all events that can be emitted inside the DocumentModel
 */
export type EventMap = {
  [EventType.Changed]: ModelEvents;
  [EventType.CaretManagerUpdated]: CaretManagerEvents;
};
