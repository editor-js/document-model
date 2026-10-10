## RENAMED Requirements

- FROM: `### Requirement: Value nodes and block tunes`
- TO: `### Requirement: Value nodes and plugin data`

## MODIFIED Requirements

### Requirement: BlockNode data tree
The system SHALL provide `BlockNode` representing a single block's data tree (nested value/text nodes, arrays, and objects) plus its per-plugin `PluginDataNode`s, supporting creation/removal/lookup of data nodes, text insert/remove/format/unformat, plugin-data/value updates, and text content extraction. Updating plugin data for a plugin name the block has no entry for SHALL create that entry rather than throw.

#### Scenario: Creating a data node at an existing key
- **GIVEN** a block already has a data node at a given key
- **WHEN** `createDataNode` is called for that same key
- **THEN** it throws `AlreadyExistingKeyError`

#### Scenario: Creating a data node within an array path
- **GIVEN** a block has an array of data nodes at a path
- **WHEN** `createDataNode` targets an index within that array
- **THEN** existing entries at or after that index are shifted rather than the operation erroring

#### Scenario: Updating plugin data for a new plugin name
- **GIVEN** a block with no plugin data entry named `anchors`
- **WHEN** `updatePluginData('anchors', { id: 'intro' })` is called
- **THEN** a `PluginDataNode` named `anchors` is created, its event listener is attached before any value is set, and a `PluginDataModifiedEvent` bubbles from the block with `previous` `undefined`

#### Scenario: Plugin data events carry the acting user
- **GIVEN** a plugin data change made in a user context
- **WHEN** the event bubbles from the `PluginDataNode` through the `BlockNode`
- **THEN** its `userId` is taken from the active context, like value-node events, rather than a placeholder

Implemented in `src/entities/BlockNode/index.ts`, validated by its co-located `.spec.ts`.

### Requirement: Value nodes and plugin data
The system SHALL provide `ValueNode` for leaf non-text data storage and `PluginDataNode` for per-block data owned by a plugin, both participating in the block's event-emitting data tree. A `PluginDataNode` SHALL hold a flat key/value record, SHALL emit one `PluginDataModifiedEvent` per changed key, and SHALL delete a key when it is set to `undefined`.

#### Scenario: Modifying a value node
- **GIVEN** a `ValueNode` holding a leaf value within a block
- **WHEN** its value is updated
- **THEN** a `ValueModifiedEvent` is emitted carrying the previous and new value

#### Scenario: Removing a plugin data key
- **GIVEN** a `PluginDataNode` holding `{ id: 'intro' }`
- **WHEN** `id` is updated to `undefined`
- **THEN** a `PluginDataModifiedEvent` is emitted with `previous` `'intro'` and `value` `undefined`, and the node's serialized form no longer contains `id`

Implemented in `src/entities/ValueNode`, `src/entities/PluginDataNode`.

## ADDED Requirements

### Requirement: Generic modification of plugin data
`EditorDocument.modifyData` SHALL apply a `Modified` change addressed by a `PluginDataIndex` by setting that plugin's key on the indexed block to the change's `value`, so undo/redo and remote operations can replay plugin data changes through the generic index-based entry point.

#### Scenario: Replaying a plugin data change by index
- **GIVEN** a block at index 1 whose `anchors` plugin data has `visible: true`
- **WHEN** `modifyData(Index.pluginData(1, 'anchors', 'visible'), { value: false, previous: true })` is called
- **THEN** the block's `anchors.visible` becomes `false` and a `PluginDataModifiedEvent` is emitted with that index
