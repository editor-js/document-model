## MODIFIED Requirements

### Requirement: Blocks holder rendering and input capture
The system SHALL provide `BlocksUI`, which renders the contenteditable blocks holder, adds/removes block wrappers on `core:BlockAdded`/`core:BlockRemoved`, captures native `beforeinput` and remaps it into a normalized `BeforeInputUIEvent`, delegates native `keydown` as a `KeydownUIEvent` so plugins can claim keyboard shortcuts, handles undo/redo keyboard shortcuts for keys no plugin claimed, and dispatches block-hover selection events.

#### Scenario: Inserting a block wrapper at an index
- **GIVEN** a `BlockAddedCoreEvent` with a valid index
- **WHEN** `BlocksUI` processes it
- **THEN** the block element is wrapped and inserted at that position in the blocks holder, or appended if the index is beyond the current list

#### Scenario: Rejecting an invalid block index
- **GIVEN** a `BlockAddedCoreEvent`/`BlockRemovedCoreEvent` with an out-of-bounds index
- **WHEN** `BlocksUI` processes it
- **THEN** it throws an "Index out of bounds" error

#### Scenario: Hovering a block dispatches selection
- **GIVEN** the pointer enters a rendered block element
- **WHEN** the `mouseenter` event fires
- **THEN** `BlocksUI` dispatches a `BlockSelectedUIEvent` carrying the block and its index

#### Scenario: Normalizing beforeinput
- **GIVEN** a native `beforeinput` event fires on the blocks holder
- **WHEN** `BlocksUI` intercepts it
- **THEN** the default action is prevented and a `BeforeInputUIEvent` is dispatched carrying `data`, `inputType`, `isComposing`, and `targetRanges`, distinguishing native-input vs. contenteditable sources and cross-input selections

#### Scenario: Delegating native keydown events
- **GIVEN** a native `keydown` event fires on the blocks holder
- **WHEN** `BlocksUI` intercepts it
- **THEN** it dispatches a `KeydownUIEvent` on the `EventBus` carrying the native event as `nativeEvent`, before any of its own key handling

#### Scenario: A plugin claims a keyboard shortcut
- **GIVEN** a plugin listening for `KeydownUIEvent` calls `preventDefault()` on the native event
- **WHEN** the dispatch returns
- **THEN** `BlocksUI` performs no further handling for that key, so a plugin-registered shortcut takes precedence over the built-in handling

#### Scenario: Undo/redo keyboard shortcuts
- **GIVEN** the blocks holder has focus and no plugin claimed the key
- **WHEN** Cmd/Ctrl+Z is pressed
- **THEN** `api.document.undo()` is called with the default action prevented; if Shift is also held, `api.document.redo()` is called instead

#### Scenario: Delegating native copy events
- **GIVEN** a native `copy` event fires on the blocks holder
- **WHEN** `BlocksUI` intercepts it
- **THEN** it dispatches a `CopyUIEvent` on the `EventBus` carrying the native event as `nativeEvent`, without calling `preventDefault` itself

Implemented in `src/Blocks/Blocks.ts`, `src/Blocks/events/*`.
