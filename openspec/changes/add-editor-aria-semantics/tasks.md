## 1. Spike: confirm `ui-kit` popover button support

- [ ] 1.1 Manually render a `PopoverInline` with `wrapperTag: 'button'` (e.g. in the `packages/editorjs` e2e fixture or a scratch script) against the installed `@editorjs/ui-kit@^1.1.5` and confirm items render as real `<button>` elements without layout/behavior regressions
- [ ] 1.2 Confirm `PopoverItemDefault.getElement()` returns the live DOM node after construction and after any internal re-render (`reset()`/confirmation mode), per design.md's "Decisions" section
- [ ] 1.3 Record the outcome in design.md's "Open Questions" (resolve or update the fallback plan to `role="button"` + `tabindex="0"` on a `<div>` if `wrapperTag: 'button'` doesn't work cleanly)

## 2. Blocks holder accessibility (`BlocksUI`)

- [ ] 2.1 Write a failing test asserting the blocks holder element has `role="textbox"` and `aria-multiline="true"` after `BlocksUI` renders it
- [ ] 2.2 Set `role="textbox"` and `aria-multiline="true"` on the blocks holder element in `packages/ui/src/Blocks/Blocks.ts`
- [ ] 2.3 Confirm the test passes; run `yarn workspace @editorjs/ui test`

## 3. Paragraph block accessibility

- [ ] 3.1 Write a failing test in `packages/tools/paragraph` asserting the lazily-created contenteditable element has a non-empty `aria-label`
- [ ] 3.2 Set `aria-label` (e.g. `"Paragraph"`) on the contenteditable `<div>` in `packages/tools/paragraph/src/index.ts` at creation time
- [ ] 3.3 Confirm the test passes; run `yarn workspace @editorjs/paragraph test`

## 4. Floating toolbar accessibility (`ToolbarUI`)

- [ ] 4.1 Write a failing test asserting the toolbar's actions container has `role="toolbar"` and the plus-button has a non-empty `aria-label`
- [ ] 4.2 Set `role="toolbar"` on the actions container and `aria-label` on the plus-button in `packages/ui/src/Toolbar/Toolbar.ts`
- [ ] 4.3 Confirm the test passes

## 5. Toolbox accessibility (`ToolboxUI`)

- [ ] 5.1 Write a failing test asserting the toolbox list has `role="menu"` and each rendered tool entry has `role="menuitem"` and an accessible name matching the tool's title
- [ ] 5.2 Set `role="menu"` on the toolbox list container and `role="menuitem"` + `aria-label` (from tool title) on each entry in `packages/ui/src/Toolbox/**`
- [ ] 5.3 Confirm the test passes

## 6. Inline toolbar popover accessibility (`InlineToolbarUI`)

- [ ] 6.1 Write a failing test asserting popover items render as `<button>` elements with `aria-label` equal to the corresponding inline tool's `options.title`
- [ ] 6.2 Pass `wrapperTag: 'button'` in the popover's render params in `packages/ui/src/InlineToolbar/InlineToolbar.ts`
- [ ] 6.3 After constructing each popover item, call `getElement()` and set `aria-label` from `options.title`
- [ ] 6.4 Write a failing test asserting `aria-pressed` reflects each tool's active state for the current selection
- [ ] 6.5 Set `aria-pressed="true"`/`"false"` on each item's element based on the existing `isActive` check used to render active styling
- [ ] 6.6 Write a failing test asserting `aria-label`/`aria-pressed` survive a popover rebuild triggered by a second `core:SelectionChanged`
- [ ] 6.7 Ensure the attribute-setting logic from 6.3/6.5 runs on every popover rebuild, not just initial construction
- [ ] 6.8 Confirm all inline toolbar tests pass

## 7. Verification and docs

- [ ] 7.1 Run `yarn lint` and `yarn test` across affected workspaces (`ui`, `paragraph`) to confirm no regressions
- [ ] 7.2 Manually verify announcements with a screen reader (e.g. VoiceOver) for: entering a paragraph block, opening the toolbar/toolbox, selecting text and toggling bold via the inline popover — record findings, file follow-ups for anything not covered by this change's scope
- [ ] 7.3 Update `packages/editorjs/e2e/tests/editor.spec.ts` (or add a new test) to use `getByRole`/`getByLabel` for the bold-toolbar interaction now that it's available, and update `packages/editorjs/e2e/README.md`'s "Why not `getByRole`" section to reflect the new semantics
- [ ] 7.4 Run `openspec validate add-editor-aria-semantics --strict` before archiving
