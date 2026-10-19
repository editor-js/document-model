## ADDED Requirements

### Requirement: Plugin data operations
`CollaborationManager` SHALL translate a `PluginDataModifiedEvent` into a `Modify` `Operation` on its `PluginDataIndex`, with `payload` set to the new value and `prevPayload` to the previous value. `OperationsTransformer` SHALL shift a plugin data operation's block index against block insertions and removals the same way it does for data index operations, SHALL turn it into a `Neutral` operation when its block is removed, and SHALL resolve two concurrent writes to the same block, plugin and key the same way it resolves two concurrent writes to the same data key: the operation being transformed becomes `Neutral` when the operation it is transformed against is the later of the two, an unsent local operation counting as later than any revision. Writes to different blocks, different plugins or different keys SHALL be left untransformed, since one cannot shift another's position. Transformation SHALL also accept a plugin data operation as the operation being transformed *against*, rather than rejecting its index kind. The `Modify` operation payload type SHALL admit any JSON value, including primitives.

#### Scenario: Local plugin data change becomes an operation
- **GIVEN** the local user changes `anchors.visible` on block 1 from `true` to `false`
- **WHEN** `CollaborationManager` handles the resulting event
- **THEN** it sends a `Modify` operation on `Index.pluginData(1, 'anchors', 'visible')` with `payload` `false` and `prevPayload` `true`, rather than logging an unknown event

#### Scenario: Inverting a plugin data operation
- **GIVEN** a plugin data `Modify` operation with `payload` `false` and `prevPayload` `true`
- **WHEN** `inverse()` is called
- **THEN** it returns a `Modify` operation on the same index with `payload` `true` and `prevPayload` `false`

#### Scenario: Transforming against a block insertion
- **GIVEN** a plugin data operation on block 2 and a concurrent block insertion at index 0
- **WHEN** the plugin data operation is transformed against the insertion
- **THEN** its index targets block 3

#### Scenario: A plugin data operation as the against-operation
- **GIVEN** any pending or stacked operation and a plugin data `Modify` operation to transform it against
- **WHEN** the transformation runs — as it does for pending operations on the client, for the undo/redo stacks on every remote plugin data event, and for conflicting operations on the server
- **THEN** it completes and returns an operation, rather than throwing an unsupported-index error

#### Scenario: A scalar payload
- **GIVEN** a plugin data change whose value is a boolean
- **WHEN** the operation is constructed
- **THEN** the payload type admits it, so scalar plugin data is representable in an operation

#### Scenario: Transforming against removal of its block
- **GIVEN** a plugin data operation on block 2 and a concurrent removal of block 2
- **WHEN** the plugin data operation is transformed against the removal
- **THEN** it becomes a `Neutral` operation

#### Scenario: Two clients write the same key concurrently
- **GIVEN** clients A and B both write `anchors.visible` on block 1, and the server applies A before B
- **WHEN** B receives A's operation while its own write is still unsent
- **THEN** A's operation is transformed to `Neutral` on B, so B keeps the value the server will end up holding rather than being left on A's

#### Scenario: Concurrent writes to different keys
- **GIVEN** a plugin data operation on `anchors.visible` and a concurrent one on `anchors.id` of the same block
- **WHEN** one is transformed against the other
- **THEN** it is returned unchanged, because the two do not describe the same value
