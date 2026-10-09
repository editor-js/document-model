## MODIFIED Requirements

### Requirement: Floating toolbar
The system SHALL provide `ToolbarUI`, which renders a floating toolbar with a plus-button, a settings button, and an actions area, repositions itself to the selected block's offset on `ui:blocks:block-selected` (unless the Toolbox or block settings are open), opens the Toolbox on plus-button click, opens block settings for the selected block on settings-button click, and mounts the block settings popover element announced via `ui:block-settings:rendered` into its actions area.

#### Scenario: Repositioning on block selection
- **GIVEN** a `BlockSelectedUIEvent` is received and neither the Toolbox nor block settings are currently open
- **WHEN** `ToolbarUI` handles the event
- **THEN** the toolbar moves to the selected block's `offsetTop`

#### Scenario: Opening the toolbox
- **GIVEN** the user clicks the toolbar's plus button
- **WHEN** the click is handled
- **THEN** `ToolbarUI` dispatches a `ToolboxOpenUIEvent`

#### Scenario: Opening block settings
- **GIVEN** the toolbar is positioned at the block at index 2
- **WHEN** the user clicks the settings button
- **THEN** `ToolbarUI` dispatches a `ui:block-settings:open` event targeting block index 2

#### Scenario: Toolbar stays put while settings are open
- **GIVEN** block settings are open
- **WHEN** the pointer hovers a different block
- **THEN** the toolbar does not move until settings close

Implemented in `src/Toolbar/Toolbar.ts`, `src/Toolbar/ToolbarRenderedUIEvent.ts`.

### Requirement: Accessible floating toolbar
`ToolbarUI` SHALL expose its actions container with `role="toolbar"` and an accessible name distinguishing it from the inline toolbar. Its plus-button and settings-button controls SHALL each have an accessible name (`aria-label`) describing their action, sourced from the message catalogue, and SHALL each advertise the menu they control via `aria-haspopup="menu"`.

#### Scenario: Toolbar actions container has toolbar role
- **GIVEN** `ToolbarUI` has rendered its actions container
- **WHEN** the element is inspected
- **THEN** it has `role="toolbar"` and a non-empty `aria-label`

#### Scenario: Plus-button has an accessible name
- **GIVEN** `ToolbarUI` has rendered the plus-button
- **WHEN** the element is inspected
- **THEN** it has a non-empty `aria-label`

#### Scenario: Settings-button has an accessible name
- **GIVEN** `ToolbarUI` has rendered the settings button
- **WHEN** the element is inspected
- **THEN** it has a non-empty `aria-label` taken from the message catalogue, and `aria-haspopup="menu"`

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

#### Scenario: Settings-button reports the block settings state
- **GIVEN** block settings are closed
- **WHEN** the settings button is inspected
- **THEN** its `aria-expanded` is `"false"`
- **WHEN** block settings open and later close
- **THEN** its `aria-expanded` follows that state, and the button is focused before the popover opens so focus returns to it when the popover closes
