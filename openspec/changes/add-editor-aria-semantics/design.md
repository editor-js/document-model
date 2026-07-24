## Context

`@editorjs/ui` renders the editor shell as plain `<div>`s wired together via `EventBus` events (`ui:*:rendered`, `core:*`); see `openspec/specs/ui/spec.md`. None of `EditorjsUI`, `BlocksUI`, `ToolbarUI`, `InlineToolbarUI`, or `ToolboxUI` currently set any `role` or `aria-*` attribute. The paragraph block (`packages/tools/paragraph`) renders a bare contenteditable `<div>` with no accessible name.

The inline toolbar's popover (bold/italic/link buttons) is not rendered by `ui` directly — `InlineToolbarUI` builds a `PopoverInline` from `@editorjs/ui-kit` (external npm dependency, pinned `^1.1.5`, source is vendored into `node_modules` but not part of this workspace and not editable here). Inspecting `node_modules/@editorjs/ui-kit/src/popover/components/popover-item/popover-item-default/popover-item-default.ts`:
- Item construction (`make()`) sets no `role`/`aria-*` attributes; `params.title` only renders a visible text `<div class="title">`, and only when the popover isn't in icon-only/hint mode.
- `renderParams?.wrapperTag` can be `'button'` (falls back to `'div'`), giving native button semantics for free if the caller opts in.
- `PopoverItemDefault.getElement(): HTMLElement | null` is a **public** method returning the item's root node — so a caller can reach in and set additional attributes post-render without modifying `ui-kit` itself.

Each inline tool (`BoldInlineTool`, `ItalicInlineTool`, `LinkInlineTool`) already carries a human-readable `options.title` (e.g. `'Bold'`) via `getToolbarConfig()`, unused for accessibility today.

## Goals / Non-Goals

**Goals:**
- Every interactive control rendered by `@editorjs/ui` (toolbar plus-button, toolbox items, inline-toolbar popover items) has an accessible name and, where applicable, pressed/expanded state.
- The editable surface (blocks holder, individual blocks, paragraph's contenteditable) is identifiable and navigable by assistive tech.
- All of this is achieved without modifying `@editorjs/ui-kit` source — only via its existing public API (`render params`, `getElement()`).

**Non-Goals:**
- Full WCAG conformance audit or keyboard-navigation rework (e.g. arrow-key roving tabindex across blocks) — this change is about semantics (roles/names/state), not new interaction patterns. Keyboard nav gaps found along the way get filed as follow-ups, not fixed here.
- Changes to `@editorjs/ui-kit`'s own source/behavior. If its API can't carry a given semantic, that's documented as a limitation (see Risks), not patched upstream as part of this change.
- Localization/i18n of accessible names — names are sourced from existing English strings (tool `options.title`, etc.) as-is.

## Decisions

- **Blocks holder role**: give `BlocksUI`'s holder `role="textbox"` + `aria-multiline="true"` (matches how contenteditable rich-text regions are conventionally exposed) rather than a custom `application`/`region` role, since the holder genuinely behaves like one large editable text region from an AT user's perspective. Alternative considered: `role="group"` with per-block `role="textbox"` only — rejected because the outer element itself is `contenteditable`, and screen readers key off `role="textbox"` on the editable ancestor to enter "forms/edit" mode.
- **Per-block wrapper**: no interactive role on `.ejs-block`/`.ejs-block__contents` wrappers themselves (they're structural, not focusable) — accessible name lives on the actual contenteditable element inside (e.g. paragraph's `<div contenteditable>`), consistent with how a native `<textarea>` wouldn't need its container labeled.
- **Paragraph accessible name**: add `aria-label` (static, e.g. `"Paragraph"`) rather than `aria-labelledby` pointing at visible text, since paragraph blocks have no visible label element to point to. Placeholder/empty state (if any) uses `aria-placeholder`, mirroring the native `<textarea placeholder>` semantic AT already understands.
- **Toolbar/Toolbox roles**: `role="toolbar"` on `ToolbarUI`'s actions container (standard for a row of related controls), `role="menu"`/`role="menuitem"` on `ToolboxUI`'s tool list (it behaves like a command menu, not a toolbar — items aren't simultaneously togglable state, they're one-shot "insert this block type" actions).
- **Inline popover items — pass through `ui-kit`'s existing API, don't patch it**: two changes confined to `InlineToolbarUI`'s call site:
  1. Pass `wrapperTag: 'button'` in the render params so `ui-kit` emits real `<button type="button">` elements (native focus/keyboard/click semantics, zero `ui-kit` changes needed).
  2. After each `PopoverItemDefault` is constructed, call its public `getElement()` and set `aria-label` (from the inline tool's `options.title`) and `aria-pressed` (from `isActive`) directly on the returned node. This keeps `ui-kit` untouched while still landing real ARIA state.
- **Source of accessible names for inline tools**: reuse existing `InlineTool.options.title` (already `'Bold'`, `'Italic'`, etc.) — no new field added to the `InlineTool`/`BlockTool` contracts in `@editorjs/sdk`. Avoids widening the public tool-authoring API for this change.

## Risks / Trade-offs

- **[Risk]** `ui-kit`'s popover may re-render items (e.g. on `reset()`/confirmation-mode toggle in `popover-item-default.ts:131,206`), which could blow away attributes set via `getElement()` post-render since `nodes.root.innerHTML` gets replaced. → **Mitigation**: re-apply `aria-pressed`/`aria-label` in `InlineToolbarUI` on every `core:SelectionChanged` popover rebuild (it already rebuilds the popover per selection change per the existing `ui` spec), not just once at construction.
- **[Risk]** If a future `ui-kit` version changes `PopoverItemDefault`'s internal rendering (e.g. drops `wrapperTag` support or `getElement()`), this integration silently regresses. → **Mitigation**: add a Jest assertion in `ui`'s `InlineToolbar.spec.ts` (or wherever inline toolbar tests live) that checks rendered popover items have `role`/`aria-label` after construction, so a `ui-kit` bump that breaks this fails CI instead of shipping silently.
- **[Trade-off]** Some semantics (e.g. richer live-region announcements for collaboration cursors, or per-block landmark roles) are explicitly out of scope; this change closes the "zero ARIA" gap but doesn't claim full accessibility coverage. Flagged in Non-Goals so it isn't read as a completeness claim.
- **[Risk]** `role="textbox"` + `aria-multiline="true"` on a `contenteditable` region is a widely-used pattern (e.g. many rich text editors) but AT support/behavior varies by screen reader; no automated way to verify actual AT announcement quality in CI. → **Mitigation**: manual verification with at least one screen reader (VoiceOver, given the existing macOS-oriented tooling in this repo) called out as a task, not something Jest/Playwright can confirm alone.

## Migration Plan

Purely additive DOM attribute changes — no data migration, no API version bump. Roll out as a single change; if a regression is found (e.g. a screen reader misbehaves with `role="textbox"` on the blocks holder), revert is a simple attribute removal with no state to unwind.

## Open Questions

- Does `@editorjs/ui-kit`'s `PopoverInline`/`PopoverItemDefault` support `wrapperTag: 'button'` end-to-end today (i.e. does the popover container itself expect/allow button children without layout breakage), or does design need to fall back to `role="button"` + `tabindex="0"` on a `<div>` if that render path is untested? Needs a quick spike against the installed `^1.1.5` before implementation starts.
- Should `ToolboxUI` items use `role="menuitem"` (command-menu semantics) or `role="option"` (listbox semantics, if the toolbox ever supports arrow-key selection + `aria-activedescendant`)? Leaning `menuitem` per current click-only interaction model; revisit if keyboard nav is added later.
