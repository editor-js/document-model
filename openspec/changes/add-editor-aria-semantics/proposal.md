## Why

`@editorjs/ui` (the default rendering shell) and `packages/tools/paragraph` currently emit zero `aria-*` attributes or `role`s anywhere — confirmed by grepping `packages/ui/src`, `packages/tools/paragraph/src`, and the compiled `@editorjs/ui-kit` output. The editor is a contenteditable-based block editor with a floating toolbar, an inline formatting popover, and a toolbox, none of which expose any accessible name, role, or state. As a result the editor is effectively unusable with a screen reader today. This was surfaced while writing Playwright e2e tests for `packages/editorjs` (`packages/editorjs/e2e/README.md`), where the lack of ARIA semantics also meant tests had to fall back to CSS-class selectors instead of `getByRole`/`getByLabel`.

## What Changes

- Add a `role="textbox"` (or equivalent editable-region role) and an accessible name to the blocks holder (`BlocksUI`) and to individual block wrappers, so assistive tech announces the editor and lets a user navigate between blocks.
- Add an accessible name to the paragraph tool's contenteditable element (`packages/tools/paragraph`), e.g. via `aria-label`/`aria-placeholder`, so the block's purpose and empty state are announced.
- Add `role="toolbar"` and per-control accessible names/`aria-pressed` state to `ToolbarUI` (the floating plus-button toolbar) and `ToolboxUI` (the block-type menu), so their controls are operable and announce state via assistive tech.
- Add accessible names and pressed/active state (`aria-pressed` or `aria-label`) to the inline toolbar's popover items (bold/italic/link), sourced from each inline tool's existing `options.title`. **Constraint**: the popover items themselves are rendered by `@editorjs/ui-kit` (external npm dependency, not a workspace package) — this change can only pass semantics through whatever API `ui-kit`'s `PopoverItemDefault`/`PopoverInline` already exposes (e.g. `title`/`aria-label` params) or apply them via post-render DOM attribute updates from `InlineToolbarUI`; it will NOT modify `ui-kit` internals. If `ui-kit`'s current API can't carry an accessible name, that gap is called out as an explicit limitation rather than worked around by forking/patching the dependency.
- No changes to the OT/collaboration protocol, the model, or any public `@editorjs/sdk` tool-authoring contracts — this is additive DOM/attribute work in the rendering layer.

## Capabilities

### New Capabilities
(none — this change adds requirements to existing capabilities, it doesn't introduce a new one)

### Modified Capabilities
- `ui`: `EditorjsUI`, `BlocksUI`, `ToolbarUI`, `InlineToolbarUI`, and `ToolboxUI` gain requirements to render accessible roles, names, and state on their DOM output.
- `tools`: `Paragraph` gains a requirement to expose an accessible name on its contenteditable element.

## Impact

- Affected code: `packages/ui/src/index.ts`, `packages/ui/src/Blocks/**`, `packages/ui/src/Toolbar/**`, `packages/ui/src/InlineToolbar/**`, `packages/ui/src/Toolbox/**` (exact paths per current `ui` spec), `packages/tools/paragraph/src/index.ts`.
- No dependency version bumps expected for `@editorjs/ui-kit` unless investigation in design.md finds its current API insufficient, in which case the gap is documented rather than closed by this change.
- Test impact: existing Jest suites in `ui`/`paragraph` gain assertions on rendered attributes; `packages/editorjs/e2e` tests can be migrated from CSS-class locators to `getByRole`/`getByLabel` where new semantics cover them (tracked as a follow-up, not required by this change).
- No breaking changes to public APIs.
