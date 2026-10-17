## ADDED Requirements

### Requirement: Data node event attribution
The system SHALL dispatch the `DataNodeAddedEvent` of a `createDataNode` call on an already constructed `BlockNode` synchronously, so the event carries the `userId` of the `EditorJSModel` call that caused it. Data nodes created while a `BlockNode` is being constructed SHALL still dispatch `DataNodeAddedEvent` after the block's `BlockAddedEvent`, marked as initialization events. `EditorDocument` and `EditorJSModel` SHALL keep the marker when they re-dispatch the event.

#### Scenario: Explicit data node creation is attributed
- **GIVEN** a block exists at index 0
- **WHEN** `EditorJSModel.createDataNode('user-1', 0, 'items.1', element)` is called
- **THEN** a `DataNodeAddedEvent` for `items.1` is dispatched before the call returns, with `userId: 'user-1'`, and is not marked as an initialization event

#### Scenario: Construction-time data nodes are marked
- **GIVEN** `addBlock` is called with data containing keys `style` and `items`
- **WHEN** the block's events are dispatched
- **THEN** `BlockAddedEvent` comes first, followed by one `DataNodeAddedEvent` per key, each marked as an initialization event

### Requirement: Replaying data changes by index
The system SHALL apply data changes addressed by a `DataIndex` through `EditorDocument.insertData`, `removeData` and `modifyData`:
- `modifyData` SHALL set the value at the key via `updateValue`;
- `insertData` SHALL splice the subtree in when the key's parent is an array, create it when the key is absent, and replace the existing node otherwise, dispatching `DataNodeRemovedEvent` then `DataNodeAddedEvent`;
- `removeData` SHALL remove the node at the key.

The direct `createDataNode` method SHALL keep throwing `AlreadyExistingKeyError` for an existing key.

#### Scenario: Modifying a value by index
- **GIVEN** block 0 has value `1` at `items.0.depth`
- **WHEN** `modifyData(DataIndex(0, 'items.0.depth'), { value: 0, previous: 1 })` is called
- **THEN** the value at `items.0.depth` is `0` and a `ValueModifiedEvent` is dispatched

#### Scenario: Inserting over an existing object key replaces it
- **GIVEN** block 0 has a value node at `meta`
- **WHEN** `insertData(DataIndex(0, 'meta'), newSubtree)` is called
- **THEN** `meta` holds `newSubtree`, no error is thrown, and `DataNodeRemovedEvent` then `DataNodeAddedEvent` are dispatched
