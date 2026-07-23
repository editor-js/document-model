# Tools

## Purpose

The built-in tool/plugin packages provide the default block and inline tools shipped with the editor: `@editorjs/paragraph` (block), and `@editorjs/bold`, `@editorjs/italic`, `@editorjs/inline-link` (inline). Each implements the `BlockTool`/`InlineTool` contracts from `@editorjs/sdk`.

**Note**: none of these four packages contain test files; the scenarios below are derived directly from source control flow rather than confirmed by dedicated tests.
## Requirements
### Requirement: Paragraph block tool
The system SHALL provide `Paragraph`, implementing `BlockTool<ParagraphData, ParagraphConfig>`, as the default block tool rendering plain text, with `conversionConfig: { import: 'text', export: 'text' }`.

#### Scenario: Registering the text input
- **GIVEN** a `Paragraph` instance is constructed with a `DOMBlockToolAdapter`
- **WHEN** construction completes
- **THEN** it registers `'text'` as the block's single text input key via `adapter.registerTextInputKey('text')`

#### Scenario: Lazy DOM creation on key added
- **GIVEN** the adapter dispatches a `KeyAddedEvent` for the `'text'` key
- **WHEN** `Paragraph` handles the `adapter:updated` event
- **THEN** it lazily creates a contenteditable `<div>` (cached on subsequent `render()` calls) and calls `adapter.setInput('text', div)`

#### Scenario: Cleanup on key removed
- **GIVEN** the adapter dispatches a `KeyRemovedEvent` for the `'text'` key
- **WHEN** `Paragraph` handles the event
- **THEN** it removes the paragraph element from the DOM and calls `adapter.setInput(key, undefined)` to avoid a duplicate input

Implemented in `packages/tools/paragraph/src/index.ts`.

### Requirement: Bold inline tool
The system SHALL provide `BoldInlineTool`, implementing `InlineTool` with `name: 'bold'`, `shortcut: 'CMD+B'`, and `intersectType: IntersectType.Extend`, rendering a `<b>` wrapper.

#### Scenario: Detecting active state
- **GIVEN** the current selection range
- **WHEN** `isActive(range, fragments)` is evaluated
- **THEN** it returns `true` only if the range is fully contained within an existing bold fragment's range

#### Scenario: Toggling format/unformat
- **GIVEN** the tool's active state for the current selection
- **WHEN** `getFormattingOptions(range, fragments)` is called
- **THEN** it returns `FormattingAction.Unformat` if active, `FormattingAction.Format` otherwise, both carrying the current range

#### Scenario: Extending overlapping bold ranges
- **GIVEN** `intersectType` is `Extend`
- **WHEN** a new bold format overlaps an existing bold fragment
- **THEN** the fragments are merged rather than replaced or split

Implemented in `packages/tools/bold/src/index.ts`.

### Requirement: Italic inline tool
The system SHALL provide `ItalicInlineTool`, structurally identical to `BoldInlineTool` — `name: 'italic'`, `shortcut: 'CMD+I'`, `intersectType: IntersectType.Extend` — rendering an `<i>` wrapper, with the same containment-based `isActive` and Format/Unformat toggle behavior.

#### Scenario: Toggling italic on a selection
- **GIVEN** a text selection not currently italicized
- **WHEN** the italic shortcut (`CMD+I`) or toolbar icon is activated
- **THEN** `getFormattingOptions` returns `FormattingAction.Format` and the selection is wrapped in `<i>`

Implemented in `packages/tools/italic/src/index.ts`.

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

### Requirement: Shared inline-tool activation contract
The system SHALL have all inline tools (Bold, Italic, Link) implement the same containment-based `isActive`/`getFormattingOptions` pattern, differing only in wrapper tag, keyboard shortcut, and `intersectType`.

#### Scenario: Consistent containment check across tools
- **GIVEN** any of Bold, Italic, or Link is evaluating `isActive` for the current selection
- **WHEN** the selection range is fully contained within an existing fragment for that tool
- **THEN** `isActive` returns `true`, using the same range-containment logic regardless of which tool is evaluating it

Cross-referenced across `packages/tools/bold/src/index.ts`, `packages/tools/italic/src/index.ts`, `packages/tools/inline-link/src/index.ts`, and validated indirectly by the generic facade test `packages/sdk/src/tools/facades/BaseToolFacade.spec.ts`.

