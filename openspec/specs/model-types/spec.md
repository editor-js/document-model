# Model Types

## Purpose

`@editorjs/model-types` provides the shared, dependency-free low-level types, nominal identifiers, event payload shapes, and base event classes used internally by `@editorjs/model` and `@editorjs/sdk`. It contains no editor runtime logic beyond the `Index`/`IndexBuilder` location-pointer utilities, `keypath` object helpers, and block ID generation. It exists so `model` and `sdk` can share type definitions without depending on each other, and is not intended for direct use by other packages or tools.

## Requirements

### Requirement: Nominal identifier types
The system SHALL provide nominal (branded) types for `BlockId`, `BlockToolName`, `BlockTuneName`, `DataKey`, and `InlineToolName` so that structurally identical primitives (e.g. two different kinds of string IDs) are not interchangeable at the type level.

#### Scenario: Generating a block id
- **GIVEN** a new block is being created
- **WHEN** `generateBlockId()` is called
- **THEN** it returns a 21-character URL-safe random `BlockId`, generated via `crypto.getRandomValues`

Implemented in `src/Nominal.ts`, `src/BlockId.ts`, `src/BlockTune.ts`, `src/DataKey.ts`, `src/InlineTool.ts`.

### Requirement: Document and block serialization shapes
The system SHALL define the serialized shapes for blocks, text nodes, and documents (`BlockData`, `BlockNodeInit`, `BlockNodeSerialized`, `TextNodeSerialized`, `EditorDocumentSerialized`, `ChangeData`) so `model` and `sdk` agree on wire/storage format.

#### Scenario: Distinguishing child node types
- **GIVEN** a block's data tree contains both plain values and text nodes
- **WHEN** a data node is serialized
- **THEN** it is tagged with the hidden discriminator property `$t` (`NODE_TYPE_HIDDEN_PROP`) set to a `BlockChildType` (`Value` or `Text`) so consumers can distinguish node kinds without inspecting shape

Implemented in `src/BlockNode.ts`, `src/Text.ts`, `src/Value.ts`, `src/EditorDocument.ts`, `src/ChangeData.ts`, `src/BlockChildType.ts`.

### Requirement: Index — composite document location pointer
The system SHALL provide an `Index` class representing a location within a document (document id, block index, data key, tune name/key, property name, and/or text range, or a composite of multiple text indexes), with validation that rejects structurally inconsistent combinations.

#### Scenario: Invalid combination of index fields
- **GIVEN** an `Index` is being validated
- **WHEN** `tuneName` is set without `tuneKey`, or `tuneName` is combined with `dataKey`/`textRange`, or `propertyName` is combined with any block-related field, or `blockIndex`+`textRange` is set without `dataKey`, or `documentId` is combined with `dataKey`/`tuneName`/`tuneKey`/`textRange` without `blockIndex`
- **THEN** `validate()` throws an `Invalid index` error

#### Scenario: Composite index for cross-block selections
- **GIVEN** a selection spans multiple text ranges (e.g. across blocks)
- **WHEN** an `Index` is built with `compositeSegments`
- **THEN** it SHALL contain at least two segments, each of which is itself a valid text index (`isTextIndex === true`), and no other root-level index fields may be set simultaneously; an empty `compositeSegments` array is treated as a non-composite (legacy) index

#### Scenario: Parsing a serialized index
- **GIVEN** a serialized index value
- **WHEN** `Index.parse` is called
- **THEN** it accepts either a plain string (legacy single-index form) or an object with a `composite` array of string segments, and throws otherwise

Implemented in `src/Index/Index.ts`, `src/Index/IndexBuilder.ts`, validated by `src/Index/Index.spec.ts`.

### Requirement: Base document event and event bus
The system SHALL provide a `BaseDocumentEvent` base class carrying `{ index, action, data, userId }` that fires under the `EventType.Changed` DOM event type, concrete event subclasses for each kind of document mutation (block/data/text add/remove/modify, tune/property modification), and a thin `EventBus` (`EventTarget` subclass) used to dispatch them.

#### Scenario: Emitting a document mutation event
- **GIVEN** a block, text, or value node is added, removed, or modified
- **THEN** the corresponding concrete event (e.g. `DataNodeAddedEvent`, `TextFormattedEvent`, `BlockAddedEvent`, `PropertyModifiedEvent`, `TuneModifiedEvent`) is dispatched as `EventType.Changed`, carrying an `EventAction` (`Added`/`Removed`/`Modified`) and the affected `Index`

#### Scenario: Emitting a caret event
- **GIVEN** a caret is added, removed, or updated
- **THEN** the corresponding caret event (`CaretManagerCaretAddedEvent`, `CaretManagerCaretRemovedEvent`, `CaretManagerCaretUpdatedEvent`) is dispatched as `EventType.CaretManagerUpdated`, carrying the serialized `Caret`

Implemented in `src/BaseDocumentEvent.ts`, `src/EventBus.ts`, `src/EventType.ts`, `src/EventAction.ts`, `src/EventMap.ts`, `src/events/*`.

### Requirement: Keypath utilities
The system SHALL provide generic dot-path object utilities (`get`, `set`, `has`, `insert`, `remove`, `renumberKeys`) for reading and mutating nested data by string path.

#### Scenario: Reading and mutating by path
- **GIVEN** a nested object and a dot-separated path string
- **WHEN** `get`/`set`/`has`/`insert`/`remove` is called with that path
- **THEN** the corresponding nested value is read, written, checked, inserted, or removed, including array paths (e.g. `items.0.text`)

Implemented in `src/keypath.ts`, validated by `src/keypath.spec.ts`. (Noted in `src/index.ts` as a candidate for extraction into a standalone `@editorjs/utils` package.)
