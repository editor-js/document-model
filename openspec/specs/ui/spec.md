# UI

## Purpose

`@editorjs/ui` is the default rendering shell for Editor.js: a set of `EditorjsPlugin` implementations that subscribe to the core `EventBus` to render DOM and dispatch their own `ui:*` events so the pieces can wire themselves together. It owns no document state — it renders what `core` (`BlockManager`/`SelectionManager`, etc.) reports, and forwards user interaction back through `EditorAPI`.

**Note**: this package's automated test suite covers the block settings menu and the toolbar
wiring that opens it. The scenarios for the components it does not reach yet are still derived
from the event-wiring logic in source rather than confirmed by unit tests, though the toolbar's
accessibility behaviour is additionally asserted end to end by `packages/editorjs/e2e`.
## Requirements
### Requirement: Shell assembly
The system SHALL provide `EditorjsUI` as the top-level shell that creates the editor wrapper in the holder element and reactively assembles the Toolbar, InlineToolbar, and Blocks elements into it as each announces its own `*:rendered` event, without holding direct references to those components.

#### Scenario: Assembling the shell from render events
- **GIVEN** `EditorjsUI` has created the wrapper element
- **WHEN** `ui:toolbar:rendered`, `ui:inline-toolbar:rendered`, and `ui:blocks:rendered` events are received
- **THEN** the corresponding rendered elements are appended to the wrapper in the order the events arrive

Implemented in `src/index.ts`.

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

### Requirement: Accessible blocks holder
`BlocksUI` SHALL expose its contenteditable blocks holder element as a structural container, via `role="group"` — the holder itself is not an editable region; each block owns its own `role="textbox"` and accessible name (see the `tools` spec's `Paragraph` requirement), which avoids nesting a `textbox` role inside another `textbox` role between the holder and its contenteditable block children.

#### Scenario: Blocks holder exposes group role
- **GIVEN** `BlocksUI` has rendered the blocks holder element
- **WHEN** the element is inspected
- **THEN** it has `role="group"`

#### Scenario: Blocks holder does not nest an editable region
- **GIVEN** the editor has rendered a single paragraph block
- **WHEN** the accessibility tree beneath the blocks holder is inspected
- **THEN** exactly one element exposes `role="textbox"` — the block's contenteditable element, not the holder

### Requirement: Accessible floating toolbar
`ToolbarUI` SHALL expose its actions container with `role="toolbar"` and an accessible name distinguishing it from the inline toolbar. Its plus-button control SHALL have an accessible name (`aria-label`) describing its action, and SHALL advertise the toolbox menu it controls via `aria-haspopup="menu"` and an `aria-expanded` state kept in sync with whether the toolbox is open.

#### Scenario: Toolbar actions container has toolbar role
- **GIVEN** `ToolbarUI` has rendered its actions container
- **WHEN** the element is inspected
- **THEN** it has `role="toolbar"` and a non-empty `aria-label`

#### Scenario: Plus-button has an accessible name
- **GIVEN** `ToolbarUI` has rendered the plus-button
- **WHEN** the element is inspected
- **THEN** it has a non-empty `aria-label`

### Requirement: The block actions toolbar is a single tab stop
`role="toolbar"` declares that the group is reached once by `Tab` and navigated internally with the arrow keys; a browser does not provide that on its own. `ToolbarUI` SHALL therefore maintain a roving tabindex over its own controls — exactly one in the tab order at a time, moved by the horizontal arrow keys — and SHALL declare its `aria-orientation`. Only the container's own controls take part: the toolbox popover renders *inside* the actions container, and its menu items are navigated by `@editorjs/ui-kit`, so keys arriving from within it are left alone.

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

#### Scenario: Plus-button reports the toolbox state
- **GIVEN** the toolbox is closed
- **WHEN** the plus-button is inspected
- **THEN** it has `aria-haspopup="menu"` and `aria-expanded="false"`
- **WHEN** the plus-button is activated and the toolbox opens
- **THEN** its `aria-expanded` becomes `"true"`
- **WHEN** the toolbox is dismissed
- **THEN** its `aria-expanded` returns to `"false"`

### Requirement: Focus returns to the control that opened the toolbox
Following the WAI-ARIA menu button pattern, dismissing the toolbox SHALL return DOM focus to the plus-button that opened it, so that keyboard and screen-reader users keep their place in the editor. `ToolbarUI` SHALL therefore move focus onto the plus-button when it opens the toolbox — Safari does not focus a button when it is clicked, which would otherwise leave the popover with `document.body` as the element to restore focus to.

#### Scenario: Dismissing the toolbox restores focus
- **GIVEN** the toolbox has been opened from the plus-button
- **WHEN** the user presses `Escape`
- **THEN** the toolbox closes and DOM focus is on the plus-button

#### Scenario: Inserting a block does not lose focus
- **GIVEN** the toolbox has been opened from the plus-button
- **WHEN** the user activates a menu item and a block is inserted
- **THEN** DOM focus is on a named control within the editor, not on the document body

### Requirement: Toolbox search hides filtered-out items from assistive technology
Filtering the toolbox by its search field SHALL remove non-matching items from the accessibility tree — not only hide them visually — so that assistive technology cannot reach a result the sighted user can no longer see. The `hidden` attribute that achieves this is applied by `@editorjs/ui-kit`.

#### Scenario: Filtered-out items leave the accessibility tree
- **GIVEN** the toolbox is open and exposes its block tools as menu items
- **WHEN** the user types a query that matches none of them
- **THEN** no `role="menuitem"` element remains exposed
- **WHEN** the query is changed to one that matches again
- **THEN** the matching item is exposed once more

### Requirement: Accessible toolbox menu
`ToolboxUI` SHALL name the menu its popover renders, so that the list of block types is announced as a named menu. The accessible names of the individual items and the `menu`/`menuitem` roles are produced by `@editorjs/ui-kit` from the `title` each tool is registered with.

#### Scenario: Toolbox exposes a named menu of block types
- **GIVEN** the toolbox has been opened
- **WHEN** the accessibility tree is inspected
- **THEN** a `role="menu"` element with a non-empty accessible name is exposed
- **AND** each registered block tool is exposed as a `role="menuitem"` named after its toolbox title

#### Scenario: Toolbox items are operable by keyboard
- **GIVEN** the toolbox has been opened
- **WHEN** the user presses `ArrowDown`
- **THEN** DOM focus moves onto the first menu item
- **WHEN** the user presses `Enter`
- **THEN** the corresponding block is inserted

### Requirement: Accessible inline toolbar
`InlineToolbarUI` SHALL name the toolbar its popover renders, so that it is distinguishable from the block actions toolbar. The inline popover does not move DOM focus onto its buttons — doing so drops the text selection the inline tools operate on — so `InlineToolbarUI` SHALL mirror the item highlighted by keyboard navigation onto `aria-activedescendant` of the element that holds focus, and SHALL clear it once nothing is highlighted or the toolbar is dismissed.

`aria-activedescendant` is only resolved when it names an element inside the focused element's subtree, or one the focused element claims via `aria-owns`. The toolbar is rendered as a *sibling* of the blocks holder, so setting the reference alone leaves it pointing outside the focused subtree, where assistive technology drops it. `InlineToolbarUI` SHALL therefore claim its popover via `aria-owns` on the same element, set and cleared together with the reference so the two cannot disagree. This re-parents the popover in the accessibility tree only — the DOM, and hence the text selection the inline tools operate on, is untouched.

The element carrying the pair SHALL be one inside the editor this toolbar belongs to. On a page with more than one editor, a toolbar that has been raised for a selection in another instance would otherwise claim its own popover from that instance's holder, telling assistive technology that controls operating on one document belong to another.

The accessible names of the individual buttons, their `button` role and their `aria-pressed` state are produced by `@editorjs/ui-kit` from the `title` and `isActive` each inline tool already provides.

#### Scenario: Inline toolbar exposes named formatting buttons
- **GIVEN** a range of text is selected
- **WHEN** the accessibility tree is inspected
- **THEN** a `role="toolbar"` element with a non-empty accessible name is exposed
- **AND** each available inline tool is exposed as a `role="button"` named after its title

#### Scenario: Inline tool reports whether it is applied
- **GIVEN** a range of unformatted text is selected
- **THEN** the bold button exposes `aria-pressed="false"`
- **WHEN** the bold tool is applied and the text is selected again
- **THEN** the bold button exposes `aria-pressed="true"`

#### Scenario: Highlighted inline tool is announced without taking focus
- **GIVEN** the inline toolbar is shown for a text selection
- **WHEN** the user navigates the toolbar with the arrow keys
- **THEN** the element holding focus exposes `aria-activedescendant` referencing the highlighted button
- **AND** the text selection is preserved
- **WHEN** the toolbar is dismissed
- **THEN** `aria-activedescendant` is removed

#### Scenario: The reference is not claimed from outside the editor
- **GIVEN** the inline toolbar has an item highlighted by keyboard navigation
- **WHEN** the element holding focus belongs to a different editor instance, or to no editor at all
- **THEN** neither `aria-activedescendant` nor `aria-owns` is written onto it

#### Scenario: The highlighted item is reachable from the element holding focus
- **GIVEN** the inline toolbar is shown and an item has been highlighted by keyboard navigation
- **WHEN** the reference is resolved from the element holding focus
- **THEN** that element also exposes `aria-owns` naming the popover
- **AND** the element named by `aria-activedescendant` is inside the popover so named
- **AND** it is *not* a DOM descendant of the element holding focus, the relationship being an accessibility-tree one only
- **WHEN** the toolbar is dismissed
- **THEN** `aria-owns` is removed alongside `aria-activedescendant`, leaving no claim on a destroyed popover

### Requirement: Inline toolbar announces its own availability
The inline toolbar appears next to a text selection without moving DOM focus or the virtual cursor, so nothing otherwise tells a screen reader user that it exists or that `Tab` now leads somewhere new. `InlineToolbarUI` SHALL announce its appearance through a live region, which SHALL remain mounted across popover re-renders — a region that is not already in the accessibility tree when its text changes is unreliable across assistive tech.

The announcement SHALL fire once per genuine open: not again while the toolbar stays open across selection changes, and again when the toolbar is dismissed and shown anew.

The announcement is written on a short delay, so that an identical repeat still reads as a change to the region. A toolbar dismissed inside that delay SHALL NOT announce itself — the pending write is cancelled rather than allowed to describe a toolbar that is already gone.

#### Scenario: A toolbar dismissed before the announcement lands stays silent
- **GIVEN** the inline toolbar has just appeared and its announcement is scheduled but not yet written
- **WHEN** the toolbar is dismissed before the delay elapses
- **THEN** the live region is never filled with the announcement

#### Scenario: Toolbar announces that it can be entered
- **GIVEN** no inline toolbar is shown
- **WHEN** a range of text is selected and the toolbar appears
- **THEN** the toolbar's live region is filled with a message naming the toolbar and the key that enters it

#### Scenario: Announcement does not repeat while the toolbar stays open
- **GIVEN** the inline toolbar is shown for a text selection
- **WHEN** the selection is extended or shrunk while remaining non-empty
- **THEN** the toolbar's popover is rebuilt
- **AND** no further announcement is made

#### Scenario: Announcement repeats when the toolbar is genuinely reopened
- **GIVEN** the inline toolbar has been shown and then dismissed
- **WHEN** a range of text is selected again
- **THEN** the announcement is made again

### Requirement: The inline toolbar shown is the one built for the current selection
Building the toolbar is asynchronous — every tool contributes an awaited `getToolbarConfig` — so two selection changes can be in flight at once and resolve in either order. `InlineToolbarUI` SHALL discard a build that was superseded while it was awaiting, rather than letting whichever finishes last take effect. A superseded build SHALL neither replace the popover nor reposition or re-announce the toolbar.

This is an accessibility requirement and not only a rendering one: each tool's `isActive` and `onActivate` close over the range the build started from, so a stale build puts up buttons whose `aria-pressed` describes text the user has moved off, and which act on it when activated.

Being dismissed counts as superseding: a build still awaiting when the toolbar is hidden SHALL NOT put it back up.

#### Scenario: A superseded build does not take effect
- **GIVEN** a toolbar build is awaiting its tools
- **WHEN** a further selection change starts a build of its own and the first one resolves afterwards
- **THEN** the popover in the document is the one built for the later selection
- **AND** the earlier build neither repositions nor re-announces the toolbar

#### Scenario: A build outstanding at dismissal does not resurrect the toolbar
- **GIVEN** a toolbar build is awaiting its tools
- **WHEN** the selection is dropped and the toolbar is hidden before the build resolves
- **THEN** no popover is added to the document when it does

### Requirement: Dismissed inline toolbar leaves the accessibility tree
`InlineToolbarUI` SHALL remove its tools from the document when the toolbar is dismissed, rather than only hiding them visually. A control that is invisible but still exposed leaves a screen reader able to reach and activate a tool that is no longer available.

Note that removal is the limit of what the editor controls: VoiceOver has been observed to keep reaching a dismissed tool after it has left the DOM, and no navigation clears it (recorded under Case 11 in `voiceover-verification.md`). The requirement is therefore stated over the document, which is verifiable, rather than over what any given screen reader will do with it.

#### Scenario: Inline tools are removed once the toolbar is dismissed
- **GIVEN** the inline toolbar is shown for a text selection
- **WHEN** the selection is collapsed and the toolbar is dismissed
- **THEN** no `role="button"` named after an inline tool remains exposed in the document's accessibility tree

