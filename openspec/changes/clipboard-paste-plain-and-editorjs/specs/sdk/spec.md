## ADDED Requirements

### Requirement: Paste UI event
The system SHALL provide `PasteUIEvent`, a `UIEventBase` subclass dispatched as `ui:paste` (event name constant `PasteUIEventName = 'paste'`). Its payload is `{ nativeEvent: ClipboardEvent }`, with the same shape and conventions as `CopyUIEvent`.

#### Scenario: Subscribing to paste events
- **GIVEN** a plugin holds the `EventBus`
- **WHEN** it calls `addEventListener('ui:paste', handler)`
- **THEN** the handler is typed to receive a `PasteUIEvent` whose `detail.nativeEvent` is a `ClipboardEvent`

#### Scenario: Event carries the native paste event unchanged
- **GIVEN** a `PasteUIEvent` constructed with `{ nativeEvent }`
- **WHEN** a listener reads `detail.nativeEvent`
- **THEN** it is the same `ClipboardEvent` instance, and its default action has not been prevented by the event construction

Implemented in `src/entities/EventBus/events/ui/PasteUIEvent.ts`, exported from `src/entities/EventBus/events/ui/index.ts`.
