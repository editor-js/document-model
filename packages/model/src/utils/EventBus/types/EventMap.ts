import type { EventType } from './EventType';
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
  CaretUpdatedEvent,
} from '../events';

export { CaretUpdatedEvent };

/**
 * Alias for all block events
 */
export type BlockEvents = BlockAddedEvent | BlockRemovedEvent;

export type TextNodeEvents = TextAddedEvent | TextRemovedEvent | TextFormattedEvent | TextUnformattedEvent;

export type ValueNodeEvents = ValueModifiedEvent;

export type BlockTuneEvents = TuneModifiedEvent;

export type DocumentEvents = PropertyModifiedEvent;

export type ModelEvents = BlockEvents | TextNodeEvents | ValueNodeEvents | BlockTuneEvents | DocumentEvents;
/**
 * Map of all events that can be emitted inside the DocumentModel
 */
export type EventMap = {
  [EventType.Changed]: ModelEvents;
  [EventType.CaretUpdated]: CaretUpdatedEvent;
};
