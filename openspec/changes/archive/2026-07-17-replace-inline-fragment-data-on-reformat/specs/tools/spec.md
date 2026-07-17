## MODIFIED Requirements

### Requirement: Inline link tool
The system SHALL provide `LinkInlineTool`, implementing `InlineTool` with `name: 'link'` and `intersectType: IntersectType.Replace` (a new link replaces any overlapping link rather than merging), rendering an `<a>` wrapper and exposing a popover for entering/editing the URL. Confirming a URL SHALL always re-apply the link via `FormattingAction.Format`, so editing an existing link updates its `href` to the new value.

#### Scenario: Editing an existing link
- **GIVEN** the current selection is inside an existing link fragment
- **WHEN** the toolbar renders `getToolbarConfig`
- **THEN** the icon is `IconUnlink`, the popover pre-opens with the existing `href` value, and activating the icon calls `api.selection.applyInlineTool` with `FormattingAction.Unformat` to remove the link

#### Scenario: Creating a new link
- **GIVEN** the current selection is not inside an existing link
- **WHEN** the toolbar renders `getToolbarConfig`
- **THEN** the popover opens with an empty input, autofocused via a microtask

#### Scenario: Confirming a link URL
- **GIVEN** the popover's URL input has focus
- **WHEN** the user presses Enter
- **THEN** `api.selection.applyInlineTool` is called with `data: { href: <input value> }` and `FormattingAction.Format`, whether the tool was already active or not

#### Scenario: Updating the URL of an existing link
- **GIVEN** the current selection is inside an existing link with `href: "a"`
- **WHEN** the user enters `"b"` in the popover input and presses Enter
- **THEN** the link fragment's `href` is replaced with `"b"`

#### Scenario: Wrapper href assignment
- **GIVEN** `createWrapper(data)` is called
- **WHEN** `data.href` is a string
- **THEN** the produced `<a>` element's `href` attribute is set to that value; otherwise a bare `<a>` is produced

Implemented in `packages/tools/inline-link/src/index.ts`.
