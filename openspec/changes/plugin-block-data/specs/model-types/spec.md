## MODIFIED Requirements

### Requirement: Nominal identifier types
The system SHALL provide nominal (branded) types for `BlockId`, `BlockToolName`, `PluginDataName`, `DataKey`, and `InlineToolName` so that structurally identical primitives (e.g. two different kinds of string IDs) are not interchangeable at the type level.

#### Scenario: Generating a block id
- **GIVEN** a new block is being created
- **WHEN** `generateBlockId()` is called
- **THEN** it returns a 21-character URL-safe random `BlockId`, generated via `crypto.getRandomValues`

Implemented in `src/Nominal.ts`, `src/BlockId.ts`, `src/PluginData.ts`, `src/DataKey.ts`, `src/InlineTool.ts`.

### Requirement: Document and block serialization shapes
The system SHALL define the serialized shapes for blocks, text nodes, and documents (`BlockData`, `BlockNodeInit`, `BlockNodeSerialized`, `TextNodeSerialized`, `EditorDocumentSerialized`, `ChangeData`) so `model` and `sdk` agree on wire/storage format. A block's per-plugin data SHALL be carried under the optional `plugins` key as a record of `PluginDataSerialized` keyed by plugin data name.

#### Scenario: Distinguishing child node types
- **GIVEN** a block's data tree contains both plain values and text nodes
- **WHEN** a data node is serialized
- **THEN** it is tagged with the hidden discriminator property `$t` (`NODE_TYPE_HIDDEN_PROP`) set to a `BlockChildType` (`Value` or `Text`) so consumers can distinguish node kinds without inspecting shape

#### Scenario: Serializing plugin data
- **GIVEN** a block carrying data for plugin `anchors`
- **WHEN** it is serialized
- **THEN** the data appears under `plugins.anchors`, and no `tunes` key is produced

Implemented in `src/BlockNode.ts`, `src/Text.ts`, `src/Value.ts`, `src/EditorDocument.ts`, `src/ChangeData.ts`, `src/BlockChildType.ts`, `src/PluginData.ts`.

### Requirement: Index — composite document location pointer
The system SHALL provide an abstract `IndexBase` class and one concrete subclass per pointer kind — `DocumentIndex`, `PropertyIndex`, `BlockIndex`, `PluginDataIndex`, `DataIndex`, `TextIndex` — each carrying only the fields structurally valid for that kind (e.g. `PluginDataIndex` always has `pluginName`+`pluginKey`, `PropertyIndex` never carries block-related fields), a `kind` discriminant (`IndexKind`) for narrowing, and immutable `with*` copy methods (`withBlockIndex`/`withTextRange`/`withDocumentId`) that return a new instance. The abstract `Index` class exposes static factory methods (`Index.document`/`property`/`block`/`pluginData`/`data`/`text`) and `Index.parse`, and overrides `Symbol.hasInstance` so `value instanceof Index` is true for any `IndexBase` instance even though concrete classes extend `IndexBase` directly.

#### Scenario: Constructing an index of a given kind
- **GIVEN** a location needs to be pointed to
- **WHEN** the corresponding `Index.*` factory (or a concrete class constructor) is called
- **THEN** it returns an instance of the matching subclass whose `kind` and fields are fixed by the constructor signature, so invalid field combinations (e.g. a plugin name without a plugin key, or a property name combined with a block index) cannot be constructed for that subclass

#### Scenario: Composite text selections
- **GIVEN** a selection spans multiple disjoint text ranges (e.g. across blocks)
- **WHEN** a `TextIndex` is constructed with more than one segment
- **THEN** `isComposite` is true, `isTextIndex` is false, `blockIndex`/`dataKey`/`textRange`/`documentId` are `undefined` (only meaningful for a single-segment instance), and `getTextSegments()` expands it back into one single-segment `TextIndex` per segment; constructing a `TextIndex` with zero segments throws

#### Scenario: Parsing a serialized index
- **GIVEN** a JSON string produced by `IndexBase#serialize()`
- **WHEN** `Index.parse` is called
- **THEN** it parses the JSON and dispatches on its `k` discriminator field (`doc`/`prop`/`block`/`plugin`/`data`/`text`/`composite`) to reconstruct the matching concrete instance, and throws if the value isn't a JSON object with a string `k` field or `k` is unrecognized

#### Scenario: Serializing a plugin data index
- **GIVEN** `Index.pluginData(1, 'anchors', 'id')`
- **WHEN** it is serialized
- **THEN** the result is `{"k":"plugin","b":1,"plugin":"anchors","key":"id"}`, and `Index.parse` of that string returns an equal `PluginDataIndex`

#### Scenario: Resolving a partial index accumulated during event bubbling
- **GIVEN** a leaf node (text/value/plugin data) dispatches an event carrying only its locally-known fields as a `PartialIndex`, which parent nodes progressively complete via `withBlockIndex`/`withDocumentId` as the event bubbles up
- **WHEN** `PartialIndex#resolve()` is called once all context has been attached
- **THEN** it returns the concrete `IndexBase` subclass matching the accumulated fields, throwing a specific error naming the missing/conflicting field (e.g. `PluginDataIndex requires pluginKey`, `DataIndex cannot be combined with pluginName`, `PropertyIndex cannot be combined with block-related fields`) when the fields don't resolve to a valid index; `PartialIndex` itself throws on `serialize()`, so it must always be resolved before leaving `model`

Implemented in `src/Index/IndexBase.ts`, `src/Index/index.ts` (factory/parse), `src/Index/DocumentIndex.ts`, `src/Index/PropertyIndex.ts`, `src/Index/BlockIndex.ts`, `src/Index/PluginDataIndex.ts`, `src/Index/DataIndex.ts`, `src/Index/TextIndex.ts`, `src/Index/PartialIndex.ts`, validated by `src/Index/Index.spec.ts`.

### Requirement: Base document event and event bus
The system SHALL provide a `BaseDocumentEvent` base class carrying `{ index, action, data, userId }` that fires under the `EventType.Changed` DOM event type, concrete event subclasses for each kind of document mutation (block/data/text add/remove/modify, plugin data/property modification), and a thin `EventBus` (`EventTarget` subclass) used to dispatch them.

#### Scenario: Emitting a document mutation event
- **GIVEN** a block, text, value, or plugin data node is added, removed, or modified
- **THEN** the corresponding concrete event (e.g. `DataNodeAddedEvent`, `TextFormattedEvent`, `BlockAddedEvent`, `PropertyModifiedEvent`, `PluginDataModifiedEvent`) is dispatched as `EventType.Changed`, carrying an `EventAction` (`Added`/`Removed`/`Modified`) and the affected `Index`

#### Scenario: Emitting a caret event
- **GIVEN** a caret is added, removed, or updated
- **THEN** the corresponding caret event (`CaretManagerCaretAddedEvent`, `CaretManagerCaretRemovedEvent`, `CaretManagerCaretUpdatedEvent`) is dispatched as `EventType.CaretManagerUpdated`, carrying the serialized `Caret`

Implemented in `src/BaseDocumentEvent.ts`, `src/EventBus.ts`, `src/EventType.ts`, `src/EventAction.ts`, `src/EventMap.ts`, `src/events/*`.
