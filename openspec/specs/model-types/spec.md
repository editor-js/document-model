# Model Types

## Purpose

`@editorjs/model-types` provides the shared, dependency-free low-level types, nominal identifiers, event payload shapes, and base event classes used internally by `@editorjs/model` and `@editorjs/sdk`. It contains no editor runtime logic beyond the `Index` class hierarchy of location-pointer types, `keypath` object helpers, and block ID generation. It exists so `model` and `sdk` can share type definitions without depending on each other, and is not intended for direct use by other packages or tools.

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
The system SHALL provide an abstract `IndexBase` class and one concrete subclass per pointer kind — `DocumentIndex`, `PropertyIndex`, `BlockIndex`, `TuneIndex`, `DataIndex`, `TextIndex` — each carrying only the fields structurally valid for that kind (e.g. `TuneIndex` always has `tuneName`+`tuneKey`, `PropertyIndex` never carries block-related fields), a `kind` discriminant (`IndexKind`) for narrowing, and immutable `with*` copy methods (`withBlockIndex`/`withTextRange`/`withDocumentId`) that return a new instance. The abstract `Index` class exposes static factory methods (`Index.document`/`property`/`block`/`tune`/`data`/`text`) and `Index.parse`, and overrides `Symbol.hasInstance` so `value instanceof Index` is true for any `IndexBase` instance even though concrete classes extend `IndexBase` directly.

#### Scenario: Constructing an index of a given kind
- **GIVEN** a location needs to be pointed to
- **WHEN** the corresponding `Index.*` factory (or a concrete class constructor) is called
- **THEN** it returns an instance of the matching subclass whose `kind` and fields are fixed by the constructor signature, so invalid field combinations (e.g. a tune name without a tune key, or a property name combined with a block index) cannot be constructed for that subclass

#### Scenario: Composite text selections
- **GIVEN** a selection spans multiple disjoint text ranges (e.g. across blocks)
- **WHEN** a `TextIndex` is constructed with more than one segment
- **THEN** `isComposite` is true, `isTextIndex` is false, `blockIndex`/`dataKey`/`textRange`/`documentId` are `undefined` (only meaningful for a single-segment instance), and `getTextSegments()` expands it back into one single-segment `TextIndex` per segment; constructing a `TextIndex` with zero segments throws

#### Scenario: Parsing a serialized index
- **GIVEN** a JSON string produced by `IndexBase#serialize()`
- **WHEN** `Index.parse` is called
- **THEN** it parses the JSON and dispatches on its `k` discriminator field (`doc`/`prop`/`block`/`tune`/`data`/`text`/`composite`) to reconstruct the matching concrete instance, and throws if the value isn't a JSON object with a string `k` field or `k` is unrecognized

#### Scenario: Resolving a partial index accumulated during event bubbling
- **GIVEN** a leaf node (text/value/tune) dispatches an event carrying only its locally-known fields as a `PartialIndex`, which parent nodes progressively complete via `withBlockIndex`/`withDocumentId` as the event bubbles up
- **WHEN** `PartialIndex#resolve()` is called once all context has been attached
- **THEN** it returns the concrete `IndexBase` subclass matching the accumulated fields, throwing a specific error naming the missing/conflicting field (e.g. `TuneIndex requires tuneKey`, `DataIndex cannot be combined with tuneName`, `PropertyIndex cannot be combined with block-related fields`) when the fields don't resolve to a valid index; `PartialIndex` itself throws on `serialize()`, so it must always be resolved before leaving `model`

Implemented in `src/Index/IndexBase.ts`, `src/Index/index.ts` (factory/parse), `src/Index/DocumentIndex.ts`, `src/Index/PropertyIndex.ts`, `src/Index/BlockIndex.ts`, `src/Index/TuneIndex.ts`, `src/Index/DataIndex.ts`, `src/Index/TextIndex.ts`, `src/Index/PartialIndex.ts`, validated by `src/Index/Index.spec.ts`.

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
