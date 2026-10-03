## MODIFIED Requirements

### Requirement: Base document event and event bus
The system SHALL provide a `BaseDocumentEvent` base class carrying `{ index, action, data, userId, groupId }` that fires under the `EventType.Changed` DOM event type, concrete event subclasses for each kind of document mutation (block/data/text add/remove/modify, tune/property modification), and a thin `EventBus` (`EventTarget` subclass) used to dispatch them. `groupId` is optional: it identifies the group of changes the mutation belongs to, and is `undefined` for mutations made outside a group.

#### Scenario: Emitting a document mutation event
- **GIVEN** a block, text, or value node is added, removed, or modified
- **THEN** the corresponding concrete event (e.g. `DataNodeAddedEvent`, `TextFormattedEvent`, `BlockAddedEvent`, `PropertyModifiedEvent`, `TuneModifiedEvent`) is dispatched as `EventType.Changed`, carrying an `EventAction` (`Added`/`Removed`/`Modified`) and the affected `Index`

#### Scenario: Carrying a group id
- **GIVEN** a concrete document event is constructed with a group id argument
- **WHEN** a listener reads the event's `detail`
- **THEN** `detail.groupId` equals the id that was passed

#### Scenario: Event created without a group id
- **GIVEN** a concrete document event is constructed without a group id argument
- **WHEN** a listener reads the event's `detail`
- **THEN** `detail.groupId` is `undefined`, and every other field is the same as before this field existed

#### Scenario: Emitting a caret event
- **GIVEN** a caret is added, removed, or updated
- **THEN** the corresponding caret event (`CaretManagerCaretAddedEvent`, `CaretManagerCaretRemovedEvent`, `CaretManagerCaretUpdatedEvent`) is dispatched as `EventType.CaretManagerUpdated`, carrying the serialized `Caret`

Implemented in `src/BaseDocumentEvent.ts`, `src/EventBus.ts`, `src/EventType.ts`, `src/EventAction.ts`, `src/EventMap.ts`, `src/events/*`.
