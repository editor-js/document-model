## MODIFIED Requirements

### Requirement: Floating toolbar
The system SHALL provide `ToolbarUI`, which renders a floating toolbar with a plus-button, a settings button carrying an accessible name from the message catalogue and `aria-haspopup="menu"`, and an actions area, repositions itself to the selected block's offset on `ui:blocks:block-selected` (unless the Toolbox or block settings are open), opens the Toolbox on plus-button click, opens block settings for the selected block on settings-button click, and mounts the block settings popover element announced via `ui:block-settings:rendered` into its actions area.

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

#### Scenario: Settings button reports its menu state
- **GIVEN** the toolbar's settings button
- **WHEN** block settings open and later close
- **THEN** its `aria-expanded` follows that state, and the button is focused before the popover opens so focus returns to it when the popover closes

#### Scenario: The toolbar keeps exactly one tab stop
- **GIVEN** the toolbar renders both the plus button and the settings button
- **WHEN** its roving tabindex is initialized
- **THEN** exactly one of the action buttons has `tabindex="0"`, and arrow-key navigation moves between them

#### Scenario: Toolbar stays put while settings are open
- **GIVEN** block settings are open
- **WHEN** the pointer hovers a different block
- **THEN** the toolbar does not move until settings close

Implemented in `src/Toolbar/Toolbar.ts`, `src/Toolbar/ToolbarRenderedUIEvent.ts`.
