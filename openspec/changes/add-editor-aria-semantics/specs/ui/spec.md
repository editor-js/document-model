## ADDED Requirements

### Requirement: Accessible blocks holder
`BlocksUI` SHALL expose its contenteditable blocks holder element as a structural container, via `role="group"` — the holder itself is not an editable region; each block owns its own `role="textbox"` and accessible name (see the `tools` spec's `Paragraph` requirement), which avoids nesting a `textbox` role inside another `textbox` role between the holder and its contenteditable block children.

#### Scenario: Blocks holder exposes group role
- **GIVEN** `BlocksUI` has rendered the blocks holder element
- **WHEN** the element is inspected
- **THEN** it has `role="group"`

### Requirement: Accessible floating toolbar
`ToolbarUI` SHALL expose its actions container with `role="toolbar"`, and its plus-button control SHALL have an accessible name (`aria-label`) describing its action (opening the toolbox).

#### Scenario: Toolbar actions container has toolbar role
- **GIVEN** `ToolbarUI` has rendered its actions container
- **WHEN** the element is inspected
- **THEN** it has `role="toolbar"`

#### Scenario: Plus-button has an accessible name
- **GIVEN** `ToolbarUI` has rendered the plus-button
- **WHEN** the element is inspected
- **THEN** it has a non-empty `aria-label`

### Requirement: Accessible toolbox menu
`ToolboxUI` SHALL expose its tool list with `role="menu"`, and each tool entry SHALL have `role="menuitem"` and an accessible name derived from the tool's title.

#### Scenario: Toolbox list has menu role
- **GIVEN** `ToolboxUI` has rendered its tool list
- **WHEN** the element is inspected
- **THEN** it has `role="menu"`

#### Scenario: Toolbox entries have menuitem role and accessible name
- **GIVEN** `ToolboxUI` has rendered an entry for a registered block tool
- **WHEN** the entry element is inspected
- **THEN** it has `role="menuitem"` and a non-empty accessible name matching the tool's title

### Requirement: Accessible inline toolbar popover items
`InlineToolbarUI` SHALL render each inline tool's popover control as a native `<button>` (via `ui-kit`'s `wrapperTag: 'button'` render param) and, after construction, set `aria-label` from the tool's `options.title` and `aria-pressed` reflecting the tool's current active state on the element returned by the popover item's `getElement()`. These attributes SHALL be re-applied whenever the popover is rebuilt in response to a selection change, so they survive `ui-kit` internally re-rendering item content.

#### Scenario: Popover item renders as a button with an accessible name
- **GIVEN** `InlineToolbarUI` has built the popover for a selection with available inline tools
- **WHEN** a popover item element is inspected
- **THEN** it is a `<button>` element with a non-empty `aria-label` equal to the corresponding tool's `options.title`

#### Scenario: Popover item reflects active state
- **GIVEN** the current selection is fully contained within an existing formatted fragment for a given inline tool
- **WHEN** the popover is rendered for that selection
- **THEN** that tool's popover item element has `aria-pressed="true"`; all other items have `aria-pressed="false"`

#### Scenario: Attributes persist across popover rebuilds
- **GIVEN** a popover item already has `aria-label`/`aria-pressed` set
- **WHEN** `core:SelectionChanged` triggers a popover rebuild
- **THEN** the rebuilt item element still has correct `aria-label` and `aria-pressed` values
