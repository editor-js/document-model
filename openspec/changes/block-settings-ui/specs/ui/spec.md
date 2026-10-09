## MODIFIED Requirements

### Requirement: Floating toolbar
The system SHALL provide `ToolbarUI`, which renders a floating toolbar with a plus-button and an actions area, repositions itself to the selected block's offset on `ui:blocks:block-selected` (unless the Toolbox or block settings are open), and opens the Toolbox on plus-button click. It SHALL mount both elements announced via `ui:block-settings:rendered` into its actions area -- the menu, and the button that opens it as a control of the container in its own right -- and SHALL reassign its single tab stop once that button joins.

#### Scenario: Repositioning on block selection
- **GIVEN** a `BlockSelectedUIEvent` is received and neither the Toolbox nor block settings are currently open
- **WHEN** `ToolbarUI` handles the event
- **THEN** the toolbar moves to the selected block's `offsetTop`

#### Scenario: Opening the toolbox
- **GIVEN** the user clicks the toolbar's plus button
- **WHEN** the click is handled
- **THEN** `ToolbarUI` dispatches a `ToolboxOpenUIEvent`

#### Scenario: Mounting an announced widget
- **GIVEN** a plugin announces a button and a menu element through `ui:block-settings:rendered`
- **WHEN** `ToolbarUI` handles the event
- **THEN** both are placed in its actions container, the button as a direct child of it, and exactly one control of the container carries `tabindex="0"`

#### Scenario: Toolbar stays put while settings are open
- **GIVEN** block settings are open
- **WHEN** the pointer hovers a different block
- **THEN** the toolbar does not move until settings close

Implemented in `src/Toolbar/Toolbar.ts`, `src/Toolbar/ToolbarRenderedUIEvent.ts`.

### Requirement: Accessible floating toolbar
`ToolbarUI` SHALL expose its actions container with `role="toolbar"` and an accessible name distinguishing it from the inline toolbar. Its plus-button SHALL have an accessible name (`aria-label`) describing its action, sourced from the message catalogue, and SHALL advertise the menu it controls via `aria-haspopup="menu"`. A control contributed by another plugin SHALL carry its own name and state, set by the plugin that owns it.

#### Scenario: Toolbar actions container has toolbar role
- **GIVEN** `ToolbarUI` has rendered its actions container
- **WHEN** the element is inspected
- **THEN** it has `role="toolbar"` and a non-empty `aria-label`

#### Scenario: Plus-button has an accessible name
- **GIVEN** `ToolbarUI` has rendered the plus-button
- **WHEN** the element is inspected
- **THEN** it has a non-empty `aria-label`

### Requirement: The block actions toolbar is a single tab stop
`role="toolbar"` declares that the group is reached once by `Tab` and navigated internally with the arrow keys; a browser does not provide that on its own. `ToolbarUI` SHALL therefore maintain a roving tabindex over its own controls — exactly one in the tab order at a time, moved by the horizontal arrow keys — and SHALL declare its `aria-orientation`. Only the container's own controls take part: the toolbox and block settings popovers render *inside* the actions container, and their menu items are navigated by `@editorjs/ui-kit`, so keys arriving from within them are left alone.

The pattern covers the **unmodified** arrow keys only. `ToolbarUI` SHALL ignore an arrow key pressed with any modifier held, and SHALL NOT call `preventDefault()` on it. A modified arrow always belongs to something else, and a screen reader is the case that matters here: VoiceOver moves its cursor with VO+Right and VO+Left, which reach the page as `Control`+`Option`+arrow. Swallowing those traps a VoiceOver user on whichever control their cursor reached, since Safari focuses a control when the cursor lands on it.

#### Scenario: Modified arrow keys are left to their owner
- **GIVEN** a control of the block actions toolbar holds focus
- **WHEN** an arrow key is pressed with `Control`+`Option`, `Meta`, or `Shift` held
- **THEN** the toolbar does not handle it and the event is not prevented
- **AND** an unmodified arrow key is still handled by the toolbar

#### Scenario: Only one control is in the tab order
- **GIVEN** `ToolbarUI` has rendered its actions container
- **WHEN** its controls are inspected
- **THEN** exactly one of them has `tabindex="0"` and the rest have `tabindex="-1"`
- **AND** the container declares `aria-orientation`

#### Scenario: Toolbox keyboard navigation is not intercepted
- **GIVEN** the toolbox has been opened from the plus-button
- **WHEN** the user presses a vertical arrow key inside the menu
- **THEN** the toolbox handles it and moves focus between menu items, unaffected by the toolbar's own arrow-key handling

#### Scenario: Block settings keyboard navigation is not intercepted
- **GIVEN** block settings have been opened from the settings button
- **WHEN** the user presses a vertical arrow key inside the menu
- **THEN** the popover handles it and moves focus between menu items, unaffected by the toolbar's own arrow-key handling

#### Scenario: Plus-button reports the toolbox state
- **GIVEN** the toolbox is closed
- **WHEN** the plus-button is inspected
- **THEN** it has `aria-haspopup="menu"` and `aria-expanded="false"`
- **WHEN** the plus-button is activated and the toolbox opens
- **THEN** its `aria-expanded` becomes `"true"`
- **WHEN** the toolbox is dismissed
- **THEN** its `aria-expanded` returns to `"false"`

#### Scenario: A contributed control joins the tab order
- **GIVEN** a plugin has announced a button through `ui:block-settings:rendered`
- **WHEN** the toolbar's controls are inspected
- **THEN** that button is one of them, reachable by the arrow keys, and exactly one control carries `tabindex="0"`

### Requirement: Blocks holder rendering and input capture
The system SHALL provide `BlocksUI`, which renders the contenteditable blocks holder, adds/removes block wrappers on `core:BlockAdded`/`core:BlockRemoved`, captures native `beforeinput` and remaps it into a normalized `BeforeInputUIEvent`, delegates native `keydown` as a `KeydownUIEvent` so plugins can claim keyboard shortcuts, handles undo/redo keyboard shortcuts for keys no plugin claimed, and dispatches block selection events.

Selection SHALL be dispatched both when the pointer enters a block and when the caret moves into one. Pointer entry alone leaves every control that acts on "the selected block" inert for a user who never moves a mouse, and the toolbar carries such controls. The caret is read from the document selection rather than from the editor's own caret state, which is cleared as soon as focus leaves the editable -- which is what reaching for a toolbar control does.

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

#### Scenario: The caret moving into a block dispatches selection
- **GIVEN** the caret is placed in a rendered block, by click or by keyboard
- **WHEN** the document selection changes to a position inside that block
- **THEN** `BlocksUI` dispatches a `BlockSelectedUIEvent` carrying the block and its index, so a keyboard-only user has a selected block without ever moving the pointer

#### Scenario: The caret staying in one block dispatches nothing
- **GIVEN** the caret is already in a block
- **WHEN** it moves within that same block, as it does on every keystroke
- **THEN** no further `BlockSelectedUIEvent` is dispatched

#### Scenario: A selection outside every block dispatches nothing
- **GIVEN** the document selection moves to a node that is in no block
- **WHEN** the selection change is handled
- **THEN** no `BlockSelectedUIEvent` is dispatched, and the last reported selection stands

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
