## ADDED Requirements

### Requirement: Applying data node and value operations
The system SHALL apply `Insert`, `Delete` and `Modify` operations addressed by a `DataIndex` to the per-document `EditorJSModel`, converting them to model data through the shared helper from `@editorjs/collaboration-manager`, after transforming them against history under the collaboration transformation rules.

#### Scenario: Late-joining client sees structural list edits
- **GIVEN** a client inserted an element at `items.1` and changed `items.1.depth`
- **WHEN** the server has processed both operations and a new client connects
- **THEN** `currentModelState()` contains the new element at `items.1` with the new depth
