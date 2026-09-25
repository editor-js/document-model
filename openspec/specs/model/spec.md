# Model

## Purpose

`@editorjs/model` is the in-memory document model engine: a tree of blocks containing text/value data nodes and inline-formatting fragments, plus multi-user caret tracking. It centralizes CRUD on document structure, text content, and inline formatting, emitting typed events (from `@editorjs/model-types`) for every mutation so collaboration and rendering layers can react. It is an internal engine consumed by `core` and `ot-server`; tools and plugins should depend on `@editorjs/sdk` instead.
## Requirements
### Requirement: EditorJSModel public facade
The system SHALL expose `EditorJSModel` as the single entry point wrapping `EditorDocument` and `CaretManager`, providing block/data/text/caret CRUD, tagging mutations with the acting `_userId`, and re-dispatching document events as `ModelEvents`.

#### Scenario: Local caret follows own edits
- **GIVEN** a user's caret is positioned within a text range
- **WHEN** that same user inserts or removes text before the caret
- **THEN** the caret's position updates to remain consistent with the new text length

#### Scenario: Remote text edits shift local caret
- **GIVEN** a remote user's `TextAddedEvent` or `TextRemovedEvent` affects a block/data key at or before the local caret's `textRange`
- **WHEN** the event is applied to the model
- **THEN** the local caret's `textRange` shifts by the inserted/removed length; if the change occurs after the caret's position, the caret is left unchanged

#### Scenario: Remote block structure changes shift local caret
- **GIVEN** a remote `BlockAddedEvent` or `BlockRemovedEvent` occurs at a block index less than or equal to the local caret's `blockIndex`
- **WHEN** the event is applied to the model
- **THEN** the local caret's `blockIndex` shifts by +1 or -1 accordingly; otherwise it is left unchanged

Implemented in `src/EditorJSModel.ts`, validated by `src/EditorJSModel.spec.ts` and `src/EditorJSModel.integration.spec.ts`.

### Requirement: EditorDocument block container
The system SHALL provide `EditorDocument` as the root container of `BlockNode`s, supporting add/remove/get by index or id (with an O(1) id lookup map), document-level properties, and generic index-based `insertData`/`removeData`/`modifyData` dispatch, bubbling child events with the block index injected.

#### Scenario: Adding a block at an out-of-bounds index
- **GIVEN** a document with N blocks
- **WHEN** `addBlock` is called with an index less than 0 or greater than N
- **THEN** it throws an "Index out of bounds" error

#### Scenario: Adding a block with a duplicate id
- **GIVEN** a block id that already exists in the document
- **WHEN** `addBlock` is called reusing that id
- **THEN** it throws `BlockAlreadyExistsError`

#### Scenario: Appending a block with no index
- **GIVEN** an existing document
- **WHEN** `addBlock` is called without an index
- **THEN** the block is appended at the end and a `BlockAddedEvent` fires carrying the serialized block data and its index

Implemented in `src/entities/EditorDocument/index.ts`, validated by its co-located `.spec.ts`.

### Requirement: BlockNode data tree
The system SHALL provide `BlockNode` representing a single block's data tree (nested value/text nodes, arrays, and objects) plus its `BlockTune`s, supporting creation/removal/lookup of data nodes, text insert/remove/format/unformat, tune/value updates, and text content extraction.

#### Scenario: Creating a data node at an existing key
- **GIVEN** a block already has a data node at a given key
- **WHEN** `createDataNode` is called for that same key
- **THEN** it throws `AlreadyExistingKeyError`

#### Scenario: Creating a data node within an array path
- **GIVEN** a block has an array of data nodes at a path
- **WHEN** `createDataNode` targets an index within that array
- **THEN** existing entries at or after that index are shifted rather than the operation erroring

Implemented in `src/entities/BlockNode/index.ts`, validated by its co-located `.spec.ts`.

### Requirement: Inline text tree
The system SHALL provide `TextNode` (extending `ParentInlineNode`) as the inline-fragment tree root for a text data node, supporting text insert/remove, format/unformat over ranges, fragment listing, and index/range validation with auto-merging/normalization of children. When a data-carrying inline tool is re-applied over a range already formatted with that same tool, the system SHALL replace the affected fragment's data with the newly supplied data instead of ignoring it. Two fragments of the same tool SHALL be considered equal (for normalization/merging) only when their data is also equal; data equality SHALL default to a deep structural comparison, which an inline tool MAY override with its own comparator.

#### Scenario: Inserting text into an empty tree
- **GIVEN** a `TextNode` with no children
- **WHEN** text is inserted
- **THEN** a child inline text node is auto-created and a `TextAddedEvent` is emitted

#### Scenario: Removing text with an out-of-range index
- **GIVEN** a `TextNode` with a bounded length
- **WHEN** `removeText` is called with indices outside that range
- **THEN** it throws a range/index validation error

#### Scenario: Overlapping formatting from the same or different tools
- **GIVEN** a text range that already has formatting applied
- **WHEN** `format` is applied again over an overlapping range (same tool or a different tool)
- **THEN** the resulting fragments nest or merge correctly without duplicating formatting

#### Scenario: Re-applying the same tool with different data
- **GIVEN** a fragment already formatted with a data-carrying tool (e.g. a `link` with `{ href: "a" }`)
- **WHEN** `format` is applied over that range with the same tool but different data (e.g. `{ href: "b" }`)
- **THEN** the fragment's data is replaced with the new data (`{ href: "b" }`) rather than the call being a no-op

#### Scenario: Re-applying the same tool with identical data
- **GIVEN** a fragment already formatted with a data-carrying tool
- **WHEN** `format` is applied over that range with the same tool and data that is equal under the effective comparator
- **THEN** the tree is left unchanged (no redundant fragments or mutations)

#### Scenario: Normalization keeps distinct-data fragments separate
- **GIVEN** two adjacent fragments of the same tool whose data differs
- **WHEN** the tree is normalized
- **THEN** the fragments are NOT merged, so each retains its own data

Implemented in `src/entities/inline-fragments/ParentInlineNode/index.ts`, `src/entities/inline-fragments/FormattingInlineNode/index.ts`, `src/entities/inline-fragments/TextNode/index.ts`, validated by `src/entities/inline-fragments/TextNode/*.spec.ts`, `src/entities/inline-fragments/FormattingInlineNode/*.spec.ts`, and `src/entities/inline-fragments/specs/InlineTree.integration.spec.ts`.

### Requirement: Value nodes and block tunes
The system SHALL provide `ValueNode` for leaf non-text data storage and `BlockTune` for per-block tune data, both participating in the block's event-emitting data tree.

#### Scenario: Modifying a value node
- **GIVEN** a `ValueNode` holding a leaf value within a block
- **WHEN** its value is updated
- **THEN** a `ValueModifiedEvent` is emitted carrying the previous and new value

Implemented in `src/entities/ValueNode`, `src/entities/BlockTune`.

### Requirement: Caret management
The system SHALL provide `CaretManager` as a per-user-id registry of `Caret`s (create/get/update/remove, dispatching Added/Updated/Removed events) and `Caret` as a holder of a nullable `Index` whose `update()` dispatches a `CaretUpdatedEvent` and which serializes via `toJSON()`.

#### Scenario: Registering a new user's caret
- **GIVEN** a user with no existing caret in the document
- **WHEN** `CaretManager` creates a caret for that user id
- **THEN** a `CaretManagerCaretAddedEvent` is dispatched carrying the serialized caret

Implemented in `src/CaretManagement/CaretManager.ts`, `src/CaretManagement/Caret/Caret.ts`, validated by their co-located `.spec.ts` files.

### Requirement: Tool registry and IoC container
The system SHALL provide an internal `ToolsRegistry` and IoC container for tool/service lookup used by the model engine.

#### Scenario: Resolving a registered tool
- **GIVEN** a tool has been registered with the model's IoC container
- **WHEN** internal model code resolves that tool by its token
- **THEN** the registered instance is returned

Implemented in `src/tools/ToolsRegistry.ts`, `src/IoC/`.

