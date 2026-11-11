## ADDED Requirements

### Requirement: Local undo of data node and value changes
The system SHALL record local `DataNodeAddedEvent`, `DataNodeRemovedEvent` and `ValueModifiedEvent`s in `UndoRedoManager` and undo them by removing the node, re-inserting the recorded subtree, or restoring the previous value. It SHALL ignore `DataNodeAddedEvent`s marked as initialization events.

#### Scenario: Undoing a value change without collaboration
- **GIVEN** collaboration is not enabled and the local user toggles `items.0.checked` from `false` to `true`
- **WHEN** `undo()` is called
- **THEN** `items.0.checked` is `false` again

#### Scenario: Initialization events are not recorded
- **GIVEN** collaboration is not enabled
- **WHEN** the local user inserts a block with data
- **THEN** the recorded undo step contains the `BlockAddedEvent` only, not the block's initialization `DataNodeAddedEvent`s
