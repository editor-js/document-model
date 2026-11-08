## MODIFIED Requirements

### Requirement: EditorAPI surface
The system SHALL expose an `EditorAPI` aggregating `BlocksAPI` (insert/insertMany/delete/move/render/clear/getBlocksCount/getPluginData/updatePluginData/getToolByIndex), `SelectionAPI` (applyInlineTool, selectedBlocks), `DocumentAPI` (serialized data, onUpdate, insertData/removeData/modifyData, undo/redo), and `TextAPI` (insert/remove/format/unformat/getFragments/get) to tools, plugins, and adapters.

`BlocksAPI` SHALL offer a reader for a single block's tool name, so that a caller needing one scalar about one block does not reach for `DocumentAPI.data` — which serializes every block, every text node and every inline fragment tree in the document, and would do so on each open of a menu.

#### Scenario: Deleting with no block selected
- **GIVEN** no block is currently selected/no caret is set
- **WHEN** `BlocksAPI.delete()` or `move()` is called without an explicit index
- **THEN** it throws an error ("No block selected to delete" / "No block selected to move")

#### Scenario: Splitting or converting with an unknown tool
- **GIVEN** a `splitBlock`/`convertBlock` call references a `dataKey` that doesn't exist, or a source/target tool that isn't registered
- **WHEN** the operation is attempted
- **THEN** it throws an error identifying the missing key or tool

#### Scenario: Inserting a block with plugin data
- **GIVEN** `BlocksAPI.insert` is called with both `data` and `plugins: { anchors: { id: 'intro' } }`
- **WHEN** the block is added to the model
- **THEN** the serialized block carries both its tool data and that plugin data, each under its own key

#### Scenario: Reading a block's tool name
- **GIVEN** a document whose block at index 1 was inserted with tool `header`
- **WHEN** `BlocksAPI.getToolByIndex(1)` is called
- **THEN** it returns `"header"`

#### Scenario: Reading the tool name of a block that is not there
- **GIVEN** an index outside the document, or a negative one
- **WHEN** `BlocksAPI.getToolByIndex` is called with it
- **THEN** it returns `undefined` rather than throwing, matching `getIdByIndex`

Implemented in `src/api/index.ts`, `src/api/BlocksAPI.ts`, `src/api/SelectionAPI.ts`, `src/api/DocumentAPI/DocumentAPI.ts`, `src/api/TextAPI.ts`, `src/components/BlockManager.ts`, validated by co-located `.spec.ts`/`.integration.spec.ts` files.
