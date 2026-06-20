import type { EventType } from '@editorjs/model-types';
import type {
  ModelEvents,
  CaretManagerEvents
} from '@editorjs/model-types';

/**
 * Map of all events that can be emitted inside the DocumentModel
 */
export type EventMap = {
  [EventType.Changed]: ModelEvents;
  [EventType.CaretManagerUpdated]: CaretManagerEvents;
};
