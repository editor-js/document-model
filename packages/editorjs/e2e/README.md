# e2e tests

Playwright tests that drive a real Chromium instance against the fixture app in
`e2e/fixtures/`, which mounts the actual `EditorJS` bundle (imported from `src/`,
no build step required).

Run with `yarn test:e2e` (or `yarn test:e2e:ui`). Vite serves the fixture; see
`e2e/vite.config.ts` and `playwright.config.ts` for wiring.

## Gotcha: `locator.press()` / `locator.selectText()` break caret tracking

Editor.js nests a `contenteditable="true"` block (e.g. `.editorjs-paragraph
[contenteditable="true"]`) inside the outer `.ejs-blocks` contenteditable host.
The editor's input handling relies on the browser's *native* selection/caret
state on that structure.

`locator.press(key)` and `locator.selectText()` both call `element.focus()`
programmatically on the specific (inner) element before acting. That JS-driven
focus call bypasses the native click-to-place-caret flow and desyncs the
editor's tracked caret/selection — keystrokes and selection-based UI (e.g. the
inline toolbar) silently stop working, with no error thrown.

**Fix:** interact the way a real user would — a real mouse `click()` (or
`click({ clickCount: 3 })` to select a line) on the locator, then drive
follow-up keys through the page-level `page.keyboard`, not `locator.press()`:

```ts
// caret placement / typing
await paragraph.click();
await page.keyboard.press('End');
await page.keyboard.type('!');

// text selection (for e.g. the inline toolbar)
await paragraph.click({ clickCount: 3 }); // triple-click selects the paragraph
```

Avoid `locator.press()` and `locator.selectText()` anywhere in this suite.

## Useful selectors

| What | Selector |
| --- | --- |
| Editor root / blocks host | `#editorjs .ejs-blocks` |
| Paragraph block wrapper | `.editorjs-paragraph` |
| Paragraph text (contenteditable) | `.editorjs-paragraph [contenteditable="true"]` |
| Inline toolbar item | `.ce-popover-item[data-item-name="<tool-name>"]` (e.g. `bold`, `italic`, `link`) |

CSS-module class names in `@editorjs/ui` are deterministic (`ejs-*` prefix, not
randomly hashed), and the paragraph tool + popover items use literal,
un-hashed classes — so these selectors are stable across builds.

### Why not `getByRole` / `getByLabel`?

That's the Playwright-recommended pattern, but it isn't available today: there
are currently zero `aria-*` attributes or `role`s anywhere in `@editorjs/ui`,
the paragraph tool, or the compiled `@editorjs/ui-kit` output (checked by
grepping source and `dist`). This is a real accessibility gap, not just a
testing inconvenience — a contenteditable-based block editor with no ARIA
semantics is unusable with a screen reader. Tracked as an OpenSpec proposal:
`openspec/changes/add-editor-aria-semantics` (see `proposal.md`). Once that
lands, prefer `getByRole`/`getByLabel` locators here and drop the CSS-class
ones above where equivalents exist.
