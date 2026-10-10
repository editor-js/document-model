## ADDED Requirements

### Requirement: v2 data conversion carries tune data into plugin data
`composeDataFromVersion2` SHALL map each v2 block's `tunes` map into the v3 block's `plugins` map, preserving each entry's key verbatim, so a v3 plugin that takes over a v2 tune's `name` finds its data. An entry whose v2 data is a plain object SHALL be copied key by key. An entry whose v2 data is a primitive or an array SHALL be stored under the single key `value`. A v2 block without `tunes`, or with an empty `tunes` map, SHALL produce no `plugins` entry.

#### Scenario: Converting object tune data
- **GIVEN** a v2 block with `tunes: { anchors: { id: 'intro' } }`
- **WHEN** it is converted to v3
- **THEN** the resulting block init carries `plugins: { anchors: { id: 'intro' } }`

#### Scenario: Converting non-object tune data
- **GIVEN** a v2 block with `tunes: { alignment: 'left' }`
- **WHEN** it is converted
- **THEN** the resulting entry is `plugins: { alignment: { value: 'left' } }`

#### Scenario: Block without tunes
- **GIVEN** a v2 block with no `tunes` key, or with `tunes: {}`
- **WHEN** it is converted
- **THEN** the resulting block init has no `plugins` key

#### Scenario: Tune with no registered plugin
- **GIVEN** a v2 block carrying tune data whose name matches no plugin registered in this editor
- **WHEN** the document is converted and loaded
- **THEN** the entry is still present in the block's `plugins` and survives serialization, per the plugin data store's preservation rule

## MODIFIED Requirements

### Requirement: EditorAPI surface
The system SHALL expose an `EditorAPI` aggregating `BlocksAPI` (insert/insertMany/delete/move/render/clear/getBlocksCount/getPluginData/updatePluginData), `SelectionAPI` (applyInlineTool, selectedBlocks), `DocumentAPI` (serialized data, onUpdate, insertData/removeData/modifyData, undo/redo), and `TextAPI` (insert/remove/format/unformat/getFragments/get) to tools, plugins, and adapters.

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

Implemented in `src/api/index.ts`, `src/api/BlocksAPI.ts`, `src/api/SelectionAPI.ts`, `src/api/DocumentAPI/DocumentAPI.ts`, `src/api/TextAPI.ts`, `src/components/BlockManager.ts`, validated by co-located `.spec.ts`/`.integration.spec.ts` files.
