# e2e tests

Playwright tests that drive a real Chromium instance against the fixture app in
`e2e/fixtures/`, which mounts the actual `EditorJS` bundle (imported from `src/`,
no build step required).

Run with `yarn test:e2e` (or `yarn test:e2e:ui`). Vite serves the fixture; see
`e2e/vite.config.ts` and `playwright.config.ts` for wiring. This runs
`aria.spec.ts`, `editor.spec.ts`, and `axe.spec.ts` against chromium and
webkit. It does **not** run `voiceover.spec.ts` — see below.

## The suite tests `dist`, so it builds first

The fixture imports this package's `src`, but that reaches `@editorjs/ui` and the
tools through their package `exports` — which point at `dist`, not source. Editing
`packages/ui/src` therefore changes nothing the suite can see until that package is
rebuilt. Both playwright configs run `yarn build:dependencies` as part of their
`webServer` command so this can't be got wrong, at the cost of a few seconds per run.

This is worth knowing about rather than just relying on: it is a failure mode that
lies in *both* directions. An unbuilt fix looks broken, and — more dangerously — an
unbuilt regression looks fine. If you bypass the configs (`npx playwright test` against
a server you started yourself, `reuseExistingServer` picking up a stale one), you are
back to auditing whatever was built last.

## Shared helpers (`e2e/support/`)

`e2e/support/editor.ts` holds what every spec needs: `mountDocument`,
`selectParagraphText`, `tabToInlineTool`, and the `PLACEHOLDER` the fixture
configures. It sits outside `e2e/tests` so Playwright's default `testMatch`
can't mistake it for a spec.

## Fixture documents

The fixture mounts one paragraph per `text` search param, so a test needing a
document other than the default remounts with one:

| URL | Document |
| --- | --- |
| `/` | a single `Hello world` block (the default every early test assumes) |
| `/?text=Alpha&text=Beta` | two blocks, `Alpha` then `Beta` |
| `/?text=` | a single empty block — how the placeholder tests get one |
| `/?text=&placeholder=` | an empty block with **no** `placeholder` option set at all |
| `/?editors=2` | two editors on one page, for anything that has to stay unique per instance |

The fixture also configures the editor's `placeholder`, which reaches the
paragraph tool as `config.placeholder` and is exposed as `aria-placeholder`.
`?placeholder=` (empty) omits the option entirely, which is the only way to get a
block that must *not* carry the attribute — `?placeholder=Something` overrides it.

`?editors=2` is worth reaching for whenever the editor writes a document-wide
`id`, since ARIA references (`aria-owns`, `aria-activedescendant`,
`aria-labelledby`) resolve by `getElementById` across the *whole page*: an id
that is unique within one editor but fixed across instances silently points the
second editor's markup at the first editor's elements. Note this mode currently
also exposes a scoping bug of its own — see the `test.fail()` on
"gives each editor on a page its own inline toolbar" in `aria.spec.ts`.

## Accessibility audits (`axe.spec.ts`)

`@axe-core/playwright` runs a static WCAG-rule audit (missing accessible
names, invalid roles, contrast, etc.) against the editor in its default,
toolbox-open, and inline-toolbar-open states. It's part of the normal
`test:e2e` run — no separate command. This catches a different class of bug
than `aria.spec.ts`: axe flags anything that violates a rule regardless of
whether a test happens to assert on it, but it can't tell you whether a
screen reader announces the *right* thing — that's `voiceover.spec.ts`.

Each audit waits for CSS animations to finish first. The popovers fade in over
~100ms and axe samples computed styles when it runs, so an audit taken
mid-animation measures a half-transparent panel and can report a contrast
violation that isn't real. Violations are asserted as `id (impact): help`
summaries rather than raw result objects, so a failure names the rule instead
of burying it in serialised nodes.

## Screen-reader tests (`voiceover.spec.ts`)

`@guidepup/playwright` drives a real, running VoiceOver instance against
Safari and exposes what it actually announced (`lastSpokenPhrase()`,
`spokenPhraseLog()`) as assertable strings — this is the automated
counterpart to `openspec/changes/add-editor-aria-semantics/voiceover-verification.md`.

Run it with:

```sh
yarn test:e2e:voiceover
```

This needs its own config (`playwright.voiceover.config.ts`, `workers: 1`,
headed) and is **macOS-only** — screen readers can't drive a headless
browser and can't run more than one instance at a time, so it's excluded
from `test:e2e` and isn't wired into CI (which doesn't run any of this
package's e2e suite yet). Before the first run:

```sh
npx @guidepup/setup setup    # configure the machine for screen reader automation
npx @guidepup/setup install  # install the screen reader assets Guidepup drives
```

### Settling an open question: measure first, then assert

`Case 8` — whether VoiceOver follows `aria-activedescendant` on the blocks
holder — sat unrun for the life of this change, on the grounds that a test
asserting either outcome would just encode a guess. That reasoning is worth
resisting, and the way out is a two-step one:

1. **Land the case as a measurement.** Assert only the parts already known to
   hold (the reference resolves, the selection survives), then *print* what
   VoiceOver actually said. Such a test cannot fail for the wrong reason, and it
   runs by command instead of by checklist.
2. **Convert the reading into an assertion**, whichever way it landed — a
   positive match, or a pinned absence in the style of Cases 3 and 15.

Case 8 went through exactly this and came out positive: arrowing to Bold is
announced `"Bold toggle button"`, arrowing on to Italic `"Italic toggle button"`,
each naming the item the reference points at, with focus and selection untouched.

Three details from that run worth reusing:

- **Take two arrow steps, not one.** `VO-Z` repeats the *last* spoken phrase, so
  a single match could be VoiceOver echoing something said before the key
  arrived. Two steps naming different tools rules that out.
- **Anchor to the name read off the element**, not to a hardcoded `"Bold"`.
  Which tool a given press count lands on is ui-kit's business.
- **Poll for the announcement; never sample it once.** Speech is asynchronous
  and nothing signals its arrival, so a `VO-Z` issued straight after the action
  returns whatever VoiceOver last *finished* saying — often the previous
  announcement entirely. This case asserted correctly and still failed that way
  once, reading back `"hello world selected"` from the click that opened the
  toolbar. Poll `VO-Z` on a slow interval (1.5s here) so the repeat doesn't
  interrupt the phrase you're waiting for, and let the timeout be what
  distinguishes "never said it" from "hasn't said it yet".
- **`syncCursorToFocus()` is not optional, and forgetting it fails only in the
  full suite.** VoiceOver reports state — `aria-activedescendant` included — for
  the element *its own cursor* is on, and it does not observe Playwright's
  synthesized events, so a page-driven focus change leaves the cursor wherever
  the previous test left it. Case 8 omitted the sync and passed in isolation,
  where a fresh session's cursor happened to be close enough, then failed after
  sixteen other cases had moved it: twenty seconds of polling with VoiceOver sat
  on the stale phrase the whole time, which reads exactly like "the feature is
  broken". **A VoiceOver case that passes alone and fails in the suite is a
  cursor-position bug until proven otherwise.**

That last rule has a limit, and the run after it found the limit. Seven cases
failed at once, all of them stuck on the plus button, and none of it was the
harness: the toolbar's roving tabindex handled `ArrowLeft`/`ArrowRight` with any
modifiers held, and **VO+Right and VO+Left arrive as `Control`+`Option`+arrow**.
Once VoiceOver's cursor reached the plus button — Safari focuses a control when
the cursor lands on it — the editor swallowed every attempt to move off it. A
VoiceOver user was trapped there. See "When the whole suite tilts" below.

And the reason it stayed open so long: the markup was broken the whole time.
`aria-activedescendant` named an element outside the focused subtree, which is
invalid and unfollowable — checkable in any browser, with no screen reader
running. Worth testing an "open question about AT behaviour" for the possibility
that it is a bug in disguise.

### Three VoiceOver behaviors the cases are built around

Each was established by experiment, because the failing case had more than one
available explanation and only some of them were the editor's fault. In all
three the markup turned out to be correct and VoiceOver simply doesn't report
the thing — which is the null hypothesis worth starting from when one of these
fails. Full results are recorded per case in `voiceover-verification.md`.

- **`aria-haspopup` suppresses `aria-expanded` in VoiceOver.** A plain button
  announces "expanded"/"collapsed" fine; add `aria-haspopup` in any form and it
  switches to "pop-up button" and drops the state. `aria-controls` does not
  restore it. So Case 15 asserts what VoiceOver does expose instead of the state.
- **`contenteditable` suppresses link announcement at the browse cursor** — not
  `role="textbox"`, which a plain contenteditable proves innocent. Links inside a
  block are only announced once you interact with the field (`VO+Shift+Down`),
  which is why Case 17 calls `voiceOver.interact()`.
- **Container names don't reach the browse cursor.** `VO+Right` steps from the
  block straight onto the plus button without ever announcing the `role="toolbar"`
  named "Block actions" that contains it. Naming a container is not what makes it
  reachable — an unnamed group being transparent (Case 1) does not imply a named
  one is announced. Case 3 pins the absence rather than asserting the name.

Cases 3 and 15 assert these absences rather than skipping them, so a future
VoiceOver that starts reporting the state or the container name fails the suite
and prompts the case back into a positive assertion.

### When the whole suite tilts

One case failing is usually about that case. **Several unrelated cases failing
the same way is a product bug, and the shape of the failure names it.** Seven
cases failed together here — cases 1, 2, 7, 11, 12, 13 and 15 — with three
different-looking symptoms: reading the plus button where the paragraph should
be, not finding a block that is plainly in the document, and a forward walk that
never reached anything. One thing explains all three: VoiceOver's cursor could
get onto the plus button and never get off. The editor was calling
`preventDefault()` on `Control`+`Option`+arrow.

Two things made it look like flakiness rather than a bug, and both are worth
recognising next time:

- **It was intermittent across runs.** It only bites once the cursor has landed
  on a toolbar control, and whether a given `next()` step goes there or onto the
  live region depends on VoiceOver's tree state. A previous full run passed 16
  of 17 with the same code.
- **Nothing in the editor's markup was wrong.** Playwright's failure snapshot
  showed a correct accessibility tree — `group > textbox "Paragraph"`, then
  `status`, then `toolbar > button "Add block"`. The tree was right and the
  keyboard was broken, which is not a distinction an ARIA-attribute assertion
  can make.

What settled it took no screen reader at all: the snapshot marked the plus
button `[active]`, a headless mount proved focus is on `<body>` there, and a
scratch spec pressing `Control+Alt+ArrowRight` at a focused plus button showed
`defaultPrevented: true`. **Reach for a headless probe of the mechanism before
another VoiceOver run** — a real run costs six minutes and answers a narrower
question. The regression test that came out of it lives in `aria.spec.ts`
("leaves modified arrow keys to their real owner") rather than here, because the
defect is a swallowed key and asserting it needs no screen reader.

### Two traps when writing VoiceOver assertions

- **VoiceOver answers from a stale tree until it re-navigates.** A change driven
  from `page` — a click, a `fill()`, anything Playwright synthesises — is
  invisible to VoiceOver until it runs a navigation command of its own, so a
  scan taken straight afterwards can describe the page as it was before. Always
  go through `resetCursor()`, which pairs `navigateToWebContent()` with the round
  trip that refreshes it; mid-test resets need it as much as the initial mount
  does. This is what makes Case 18 deterministic.
- **A detached element is not an unreachable one, and item text for a control is
  the bare tool name.** The dismissed inline toolbar's buttons stay reachable to
  VoiceOver — it retains nodes the document has already dropped, and
  `resetCursor()` does **not** clear them. This is not a leak in the editor:
  `InlineToolbarUI#hide` destroys the popover, and `aria.spec.ts` proves the DOM
  is clean afterwards on both engines. The residue is VoiceOver's, and there is
  no navigation that makes it go away.

  Since a control's item text is just its name (Link announces as `"link"`, Bold
  as `"bold"`), any scan that walks *past* a block can match a control instead of
  the content and pass with the content unchanged — which is how Case 17 passed
  twice in three runs while asserting nothing. Bound the scan to the block with
  `interact()`. Do not substitute "the toolbar is gone from the DOM" for that;
  it's true and it doesn't help.

You'll also need to grant the terminal/IDE running the tests Accessibility
permissions (System Settings → Privacy & Security → Accessibility) the first
time it tries to control VoiceOver. Running it takes over your screen and
speaks through your speakers for the duration of the suite — it's a real
screen-reader session, not a simulation.

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

## Locators

Use `getByRole`/`getByLabel` — every surface the suite touches is reachable by
role now, including the popovers rendered by `@editorjs/ui-kit` (2.0.0+).

| What | Locator |
| --- | --- |
| Blocks host | `getByRole('group')` |
| Paragraph text (contenteditable) | `getByRole('textbox', { name: 'Paragraph' })` |
| Floating toolbar | `getByRole('toolbar', { name: 'Block actions' })` |
| Plus button | `getByRole('button', { name: 'Add block' })` |
| Toolbox menu | `getByRole('menu', { name: 'Add block' })` |
| Toolbox item | `getByRole('menuitem', { name: '<toolbox title>' })` (e.g. `Text`) |
| Toolbox search | `getByRole('searchbox', { name: 'Search' })` |
| Inline toolbar | `getByRole('toolbar', { name: 'Text formatting' })` |
| Inline tool button | `getByRole('button', { name: '<tool title>' })` (e.g. `Bold`) |

Both toolbars need their name in the locator: the block actions toolbar and the
inline toolbar are both `role="toolbar"`, and only the name tells them apart.

`aria.spec.ts` asserts each of these directly, so it doubles as the regression
test for the semantics the other specs rely on.

### Notes on the popover surfaces

The toolbox and inline toolbar are rendered by `@editorjs/ui-kit`, which derives
item roles and accessible names from params the editor already passes it — the
toolbox item's `toolbox.title`, the inline tool's `hint.title`. Nothing in the
markup needs to be targeted by class anymore, and
`.ce-popover-item[data-item-name="…"]` selectors should not be reintroduced.

Two behaviors worth knowing when writing tests against them:

- **The toolbox moves real DOM focus.** `ArrowDown` focuses the first
  `menuitem`, so `toBeFocused()` is a valid assertion and `Enter` activates it.
- **The inline toolbar does not.** Moving focus to a button drops the text
  selection in WebKit, so navigating it only moves a highlight; which item is
  current is exposed via `aria-activedescendant` on the element that holds focus
  (the blocks holder, being the outermost contenteditable). Wait for the toolbar
  to be visible before pressing an arrow key — until the popover is rendered its
  key handler is not listening and the arrow just collapses the selection.

  The holder also carries `aria-owns` naming the popover while an item is
  highlighted, and that is load-bearing rather than decorative: the toolbar is a
  *sibling* of the holder in the DOM, and `aria-activedescendant` is only resolved
  when it names something inside the focused element's subtree or claimed by it via
  `aria-owns`. **Asserting the attribute's value is not asserting that it resolves.**
  Matching `aria-activedescendant` against the button's `id` passes identically
  whether or not assistive tech can follow it — which is exactly how the missing
  `aria-owns` survived a full suite. Assert over the resolved relationship instead;
  `aria.spec.ts` has the pattern.
- **Dismissing the toolbox returns focus to the plus button**, on both the
  `Escape` and the insert-a-block path, so `toBeFocused()` on the plus button is
  the right assertion afterwards. This only works because `ToolbarUI` focuses the
  button itself when opening — Safari does not focus a `<button>` on click, and
  without it the popover restores focus to `<body>`. Assert it on webkit; chromium
  never reproduced the bug.
- **Search filtering removes items from the accessibility tree.** Filtered-out
  items get a `hidden` attribute alongside the CSS class, so
  `getByRole('menuitem')` drops to zero rather than matching invisible items.
