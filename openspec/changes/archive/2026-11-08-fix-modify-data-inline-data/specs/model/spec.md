## MODIFIED Requirements

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

#### Scenario: Modifying text with a formatting value
- **GIVEN** a `TextIndex` and a modified value `{ tool, data }`
- **WHEN** `modifyData` is called
- **THEN** the range is formatted with that `tool` and its `data`, so re-applying a data-carrying tool (e.g. redo or a remote op) keeps the fragment's data
