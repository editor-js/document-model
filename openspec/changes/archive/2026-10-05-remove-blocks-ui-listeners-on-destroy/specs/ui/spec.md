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

#### Scenario: Destroying the blocks UI
- **GIVEN** `BlocksUI` has rendered the blocks holder
- **WHEN** `destroy()` is called
- **THEN** the `beforeinput`, `keydown` and `copy` listeners are removed from the blocks holder, so native events on it no longer dispatch `BeforeInputUIEvent`, `KeydownUIEvent` or `CopyUIEvent`, and the blocks holder is detached from the DOM

Implemented in `src/Blocks/Blocks.ts`, `src/Blocks/events/*`, validated by `src/Blocks/Blocks.spec.ts`.

## ADDED Requirements

### Requirement: UI plugin listener lifetime
Each UI plugin SHALL unsubscribe its own EventBus and DOM listeners when destroyed, detach its owned holder, and dispose its owned popover. Destroying one instance SHALL leave other consumers on the shared EventBus active. Teardown SHALL be safe to repeat.

#### Scenario: Events after teardown
- **GIVEN** a UI plugin has been destroyed
- **WHEN** the shared EventBus emits a previously subscribed event or a retained DOM element receives an event
- **THEN** that instance no longer renders, moves elements, or dispatches UI actions
- **AND** unrelated listeners and a replacement plugin still receive their events

#### Scenario: Pending inline toolbar configuration
- **GIVEN** inline tool configuration is still resolving when the toolbar is destroyed
- **WHEN** the configuration finishes resolving
- **THEN** no popover is created, shown, or positioned by the destroyed toolbar

Validated by `src/lifecycle.spec.ts` using real DOM/EventBus listeners and a substituted popover boundary. Vendor-owned global listener internals are outside this requirement's verification scope.
