import type { BlockAddedEvent } from './events/BlockAddedEvent.js';
import type { BlockRemovedEvent } from './events/BlockRemovedEvent.js';
import type { TextAddedEvent } from './events/TextAddedEvent.js';
import type { TextRemovedEvent } from './events/TextRemovedEvent.js';
import type { TextFormattedEvent } from './events/TextFormattedEvent.js';
import type { TextUnformattedEvent } from './events/TextUnformattedEvent.js';
import type { ValueModifiedEvent } from './events/ValueModifiedEvent.js';
import type { TuneModifiedEvent } from './events/TuneModifiedEvent.js';
import type { PropertyModifiedEvent } from './events/PropertyModifiedEvent.js';
import type { CaretManagerCaretAddedEvent } from './events/CaretManagerCaretAddedEvent.js';
import type { CaretManagerCaretRemovedEvent } from './events/CaretManagerCaretRemovedEvent.js';
import type { CaretManagerCaretUpdatedEvent } from './events/CaretManagerCaretUpdatedEvent.js';

/**
 * Alias for all block events
 */
export type BlockEvents = BlockAddedEvent | BlockRemovedEvent;

/**
 * Alias for all text node events
 */
export type TextNodeEvents = TextAddedEvent | TextRemovedEvent | TextFormattedEvent | TextUnformattedEvent;

/**
 * Alias for all value node events
 */
export type ValueNodeEvents = ValueModifiedEvent;

/**
 * Alias for all block tune events
 */
export type BlockTuneEvents = TuneModifiedEvent;

/**
 * Alias for all document-level events
 */
export type DocumentEvents = PropertyModifiedEvent;

/**
 * Union of all events that can be emitted by the document model
 */
export type ModelEvents = BlockEvents | TextNodeEvents | ValueNodeEvents | BlockTuneEvents | DocumentEvents;

/**
 * Union of all events that can be emitted by the caret manager
 */
export type CaretManagerEvents = CaretManagerCaretAddedEvent | CaretManagerCaretUpdatedEvent | CaretManagerCaretRemovedEvent;
