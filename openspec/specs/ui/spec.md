# UI

## Purpose

`@editorjs/ui` is the default rendering shell for Editor.js: a set of `EditorjsPlugin` implementations that subscribe to the core `EventBus` to render DOM and dispatch their own `ui:*` events so the pieces can wire themselves together. It owns no document state — it renders what `core` (`BlockManager`/`SelectionManager`, etc.) reports, and forwards user interaction back through `EditorAPI`.

**Note**: this package has no automated test suite (`.spec.ts`/`.test.ts` files); the scenarios below are derived directly from the event-wiring logic in source rather than confirmed by tests.

## Requirements

### Requirement: Shell assembly
The system SHALL provide `EditorjsUI` as the top-level shell that creates the editor wrapper in the holder element and reactively assembles the Toolbar, InlineToolbar, and Blocks elements into it as each announces its own `*:rendered` event, without holding direct references to those components.

#### Scenario: Assembling the shell from render events
- **GIVEN** `EditorjsUI` has created the wrapper element
- **WHEN** `ui:toolbar:rendered`, `ui:inline-toolbar:rendered`, and `ui:blocks:rendered` events are received
- **THEN** the corresponding rendered elements are appended to the wrapper in the order the events arrive

Implemented in `src/index.ts`.

### Requirement: Blocks holder rendering and input capture
The system SHALL provide `BlocksUI`, which renders the contenteditable blocks holder, adds/removes block wrappers on `core:BlockAdded`/`core:BlockRemoved`, captures native `beforeinput` and remaps it into a normalized `BeforeInputUIEvent`, handles undo/redo keyboard shortcuts, and dispatches block-hover selection events.

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

#### Scenario: Undo/redo keyboard shortcuts
- **GIVEN** the blocks holder has focus
- **WHEN** Cmd/Ctrl+Z is pressed
- **THEN** `api.document.undo()` is called with the default action prevented; if Shift is also held, `api.document.redo()` is called instead

#### Scenario: Delegating native copy events
- **GIVEN** a native `copy` event fires on the blocks holder
- **WHEN** `BlocksUI` intercepts it
- **THEN** it dispatches a `CopyUIEvent` on the `EventBus` carrying the native event as `nativeEvent`, without calling `preventDefault` itself

Implemented in `src/Blocks/Blocks.ts`, `src/Blocks/events/*`.

### Requirement: Floating toolbar
The system SHALL provide `ToolbarUI`, which renders a floating toolbar with a plus-button and actions area, repositions itself to the selected block's offset on `ui:blocks:block-selected` (unless the Toolbox is open), and opens the Toolbox on plus-button click.

#### Scenario: Repositioning on block selection
- **GIVEN** a `BlockSelectedUIEvent` is received and the Toolbox is not currently open
- **WHEN** `ToolbarUI` handles the event
- **THEN** the toolbar moves to the selected block's `offsetTop`

#### Scenario: Opening the toolbox
- **GIVEN** the user clicks the toolbar's plus button
- **WHEN** the click is handled
- **THEN** `ToolbarUI` dispatches a `ToolboxOpenUIEvent`

Implemented in `src/Toolbar/Toolbar.ts`, `src/Toolbar/ToolbarRenderedUIEvent.ts`.

### Requirement: Inline toolbar
The system SHALL provide `InlineToolbarUI`, which builds a popover of available inline tools on `core:SelectionChanged`, shows/positions/hides itself based on whether the current selection has a non-collapsed text range, and wires tool activation to `api.selection.applyInlineTool`.

#### Scenario: Hiding on collapsed or absent selection
- **GIVEN** a `SelectionChangedCoreEvent` with no index, no text segments, only a collapsed range, or no browser selection range
- **WHEN** `InlineToolbarUI` handles the event
- **THEN** the popover is hidden

#### Scenario: Showing on a non-collapsed selection
- **GIVEN** a `SelectionChangedCoreEvent` with a non-collapsed text range
- **WHEN** `InlineToolbarUI` handles the event
- **THEN** it rebuilds the popover from the available inline tools and current fragments, positions it at the selection's bounding rect, and shows it

Implemented in `src/InlineToolbar/InlineToolbar.ts`, `src/InlineToolbar/InlineToolbarRenderedUIEvent.ts`.

### Requirement: Toolbox
The system SHALL provide `ToolboxUI`, a searchable popover of block tools populated on `core:ToolLoaded` (only tools where `tool.isBlock()` is true), which opens on `ui:toolbox:open`, tracks the hovered block index to determine insert position, and inserts a new block via `api.blocks.insert` on tool activation.

#### Scenario: Inserting a new block from the toolbox
- **GIVEN** the toolbox is open and a block index is tracked from the last hover (or none)
- **WHEN** the user activates a tool entry
- **THEN** `api.blocks.insert({ type, data, index: trackedIndex + 1 (or undefined), focus: true })` is called, and the popover closes, dispatching `ToolboxClosedUIEvent`

#### Scenario: Toolbox open/close events
- **GIVEN** the toolbox popover's open state changes
- **WHEN** it opens or closes
- **THEN** `ToolboxOpenedUIEvent` or `ToolboxClosedUIEvent` is dispatched accordingly

Implemented in `src/Toolbox/Toolbox.ts`, `src/Toolbox/events/*`, `src/Toolbox/ToolboxConfigEntry.ts`.
