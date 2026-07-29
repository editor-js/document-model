# VoiceOver verification — manual run

Covers tasks.md 7.3. **All 18 cases now run under
`yarn test:e2e:voiceover`** (`packages/editorjs/e2e/tests/voiceover.spec.ts`) via
[Guidepup](https://www.guidepup.dev/), which drives a real, running VoiceOver
instance and reads back what it actually announces (macOS only, needs a headed
browser; see that spec file's header comment and `e2e/README.md`).

**All 18 cases assert, and all 18 pass.** Case 8 was the last one open — whether
VoiceOver follows `aria-activedescendant` on the blocks holder — and a run
settled it: **it does**. See its section below for the measured output.

This document is still useful for two things: running the steps by hand to debug
why an automated case failed, and recording what real runs established. Fill in
Result/Notes for whichever cases you re-run, then summarize findings +
follow-ups at the bottom.

## Four findings that shaped these cases, and a fifth that broke the pattern

Four times while automating these cases a test failed with more than one explanation
available, and only some of them were our fault. Rather than pick one, each was
settled by experiment — a scratch page varying a single attribute at a time for the
first two, the failure output itself for the last two. All four answers are
recorded under their cases below (3, 11, 15 and 17), and all four are **the opposite of what
the obvious first guess would have been**:

| Case | First guess | What was actually true |
| --- | --- | --- |
| 15 | the missing `aria-controls` is why the state isn't announced | `aria-controls` is irrelevant; `aria-haspopup` suppresses the state |
| 17 | the `role="textbox"` this change introduced broke link announcement | a plain `contenteditable` behaves identically; the role is blameless |
| 3 | an unnamed container is silent, so a *named* one is announced | the converse does not hold; container names never reach the browse cursor |
| 11 | the tools are reachable only because VoiceOver hasn't re-navigated | the DOM is genuinely clean; VoiceOver retains them and no navigation clears it |

Every one of them left the editor's markup unchanged. The pattern worth carrying forward: **when a
VoiceOver assertion fails, the null hypothesis is that VoiceOver doesn't report the thing, not that
the markup is missing it** — check the DOM-level assertion in `aria.spec.ts` first, and note that a
clean DOM on its own does not distinguish "the element is gone from VoiceOver too" from "VoiceOver
is still holding it", which is exactly the trap Case 11 fell into. The result tables under each
case are the record; the scratch pages themselves were throwaway and are not kept in the repo.

### The fifth finding, which broke that pattern

A later run failed **seven cases at once** — 1, 2, 7, 11, 12, 13 and 15 — and this time it was the
editor's fault, though still not the markup's. The block actions toolbar's roving tabindex called
`preventDefault()` on `ArrowLeft`/`ArrowRight` whatever modifiers were held, and **VO+Right and
VO+Left arrive as `Control`+`Option`+arrow**. Safari focuses a control when the VoiceOver cursor
lands on it, so once a user's cursor reached the plus button the editor swallowed every attempt to
move off it. That is a genuine trap for a VoiceOver user, and it is invisible to every
attribute-level assertion in `aria.spec.ts`: the accessibility tree was correct throughout, and the
*keyboard* was what was broken.

Three things distinguish it from the four above, and are the tells to look for:

- **Many unrelated cases failed together, with different-looking symptoms.** One case failing is
  about that case. Several failing at once is one cause, and the cases that still *passed* named it
  — every survivor was one that walks *to* the plus button.
- **It was intermittent.** It only bites once the cursor has reached a toolbar control, so the run
  before passed 16 of 17 on identical editor code. That reads as harness flakiness, and the
  cursor-position rule from Case 8 actively pointed the wrong way.
- **It was settled headlessly, in minutes, with no screen reader.** Playwright's failure snapshot
  marked the plus button `[active]`; a headless mount showed focus is on `<body>` there, so
  something had focused it; a scratch spec pressing `Control+Alt+ArrowRight` at the focused button
  returned `defaultPrevented: true`. Prefer that to another six-minute VoiceOver run once a
  mechanism is suspected.

So the null hypothesis above holds for a *single* failing assertion about what VoiceOver says. It
does not hold for a cluster, and it says nothing at all about what VoiceOver can *do* — keyboard
interception is a class of bug this checklist can find and `aria.spec.ts` structurally cannot.
The regression test still belongs in `aria.spec.ts` ("leaves modified arrow keys to their real
owner"), because once you know the mechanism it needs no screen reader to assert.

## Setup

1. Start the e2e fixture: from `packages/editorjs/` run
   `yarn vite --config e2e/vite.config.ts --port 4173 --strictPort`, then open
   `http://localhost:4173` in **Safari** (VoiceOver's best-supported browser on
   macOS — same reasoning as the existing webkit e2e target).
2. Enable VoiceOver: `Cmd+F5` (or Cmd+Fn+F5 on newer keyboards).
3. Reference commands (VO = `Control+Option`):
   - `VO+Right`/`VO+Left` — move virtual cursor
   - `Tab`/`Shift+Tab` — move DOM focus
   - `VO+Space` — activate item under virtual cursor
   - Arrow keys — navigate within a component once focus is inside it (menu, toolbar)
   - `VO+Shift+Down` — enter an element's "interact"/forms mode; `VO+Shift+Up` to leave it
   - `Cmd+F5` — toggle VoiceOver off when done

## Case 1 — Blocks holder is a group, not a nested textbox (automated)

**Steps:** With VoiceOver on, `VO+Right` from the top of the page until you reach the editor.

**Expected:** You hear the paragraph announced **once**, as a text field ("Paragraph, text entry area") — not *text field → text field*, which is what a `contenteditable` holder without `role="group"` produces.

**Observed:** VoiceOver never announces the holder at all. An unnamed `role="group"` is structurally transparent to the virtual cursor — it isn't a landmark and has no name to speak — so it's not a stop point (`VO+Left` from the paragraph is a no-op, and `VO+Shift+Up` from it exits the whole web content rather than stepping up into a group). This is the intended outcome, not a gap: the point of the role is to *stop* the holder being announced as an editable region, and it does. The `role="group"` attribute itself is asserted in `aria.spec.ts`; the automated Case 1 asserts the absence of any second text field around the paragraph.

**Result:** ☐ Pass ☐ Fail
**Notes:**

## Case 2 — Paragraph block: name, role, multiline (automated)

**Steps:** Navigate to the paragraph text and enter it (`VO+Shift+Down` or just click it).

**Expected:**
- Announced as "**Paragraph**, text field" (or "edit text") — the `aria-label`.
- VoiceOver enters forms mode / "interact" mode without odd double-announcements.
- Typing works normally and VoiceOver echoes typed characters as usual for a multiline field (not truncated to one line).

**Result:** ☐ Pass ☐ Fail
**Notes:**

## Case 3 — Reaching the floating toolbar plus-button (automated)

**Steps:** With the caret in the paragraph, tab to or `VO+Right` to the plus-button.

**Expected:**
- The button is announced as "**Add block**, button" (not "button" alone — it's icon-only, so a missing name would announce as unlabeled).
- It's identifiable as part of a toolbar named "Block actions" (VoiceOver may announce this on entry to the group, e.g. "Block actions, toolbar"). **It is not — see Observed.**
- It announces a popup relationship, e.g. "…menu, collapsed" (`aria-haspopup="menu"` / `aria-expanded="false"`). Note the state half of that never arrives — see Case 15.

**Observed — the containing toolbar's name never reaches the browse cursor.** Walking with
`VO+Right` goes from the block **straight onto the button in a single step**, announcing
"Add block menu pop-up button". The whole route from the block to the button contains no mention
of a toolbar, named or otherwise:

| Stop | VoiceOver said |
| --- | --- |
| 1 | "Hello world, Paragraph, Type text or press Tab, text entry area" |
| 2 | "Add block menu pop-up button" |

This corrected an inference, not a regression. Case 1 establishes that the *unnamed* blocks holder
is transparent to the virtual cursor because it has no name to announce, and the reasonable-looking
converse — that a **named** container is therefore announced — does not hold for linear `VO+Right`
navigation. Whether VoiceOver's group navigation or the rotor would surface it was not tested; the
browse cursor is the path these cases are about.

The name itself is correct and asserted at the DOM level in `aria.spec.ts`, so what's untestable
here is VoiceOver's reporting of it, not the editor's markup — the same disposition as the
`aria-expanded` finding in Case 15. The automated case pins the absence, so a VoiceOver version that
starts announcing it fails and prompts this back into a real assertion.

**Result:** ☐ Pass ☐ Fail
**Notes:**

## Case 4 — Opening and navigating the toolbox menu (automated)

**Steps:** Activate the plus-button (`VO+Space` or click). Then arrow through the menu.

**Expected:**
- On open, VoiceOver announces entry into a **menu** named "Add block".
- The plus-button's state now reads "expanded" if you check back on it.
- The search field is announced as a **search field** (or edit text) named "Search".
- Arrowing down lands on a **menu item** named "Text" (the paragraph tool's toolbox title).
- Activating it (`Return`/`VO+Space`) inserts a new paragraph block and closes the menu; focus/VoiceOver cursor lands somewhere sensible afterward (not lost/stuck). The automated case asserts all three: the block count, that the menu is gone, and that focus is on a real element rather than `<body>`. *Which* element deliberately isn't pinned — that's the subject of the `test.fail()` todo in `aria.spec.ts` ("puts the caret in the block it just inserted").

**Result:** ☐ Pass ☐ Fail
**Notes:**

## Case 5 — Inline toolbar: name, buttons, pressed state (automated)

**Steps:** Type some text into a paragraph, select it (e.g. `Shift+Cmd+Right` or drag-select), and let the inline toolbar appear.

**Expected:**
- VoiceOver announces a **toolbar** named "Text formatting" appearing.
- Arrowing/exploring it reaches buttons named "**Bold**" and "**Italic**".
- After applying Bold and re-selecting the now-bold text, VoiceOver announces the Bold button's state from `aria-pressed="true"`; before that it announces no such state.

**Observed:** VoiceOver never says "pressed" — it maps `aria-pressed` onto its own toggle vocabulary and reads the applied button as "**Bold selected, toggle button**" (with the shortcut, e.g. "Bold ⌘+B"). An unpressed button is the same phrase without "selected".

**Watch out when automating this:** the toolbar only exists while text is *selected*, so a bare
match on the word "selected" can be satisfied by VoiceOver describing the selection rather than
the button — passing without the state being exposed, and failing when it is. The automated case
anchors the word to the tool's own name, close enough that the two have to belong to the same
announcement (wide enough for the shortcut VoiceOver reads in between).

**Result:** ☐ Pass ☐ Fail
**Notes:**

## Case 6 — Entering the inline toolbar via Tab (automated)

Originally reported as broken: pressing Tab while text was selected just moved the
selection instead of reaching the toolbar. Fixed upstream in `@editorjs/ui-kit` (each
inline-toolbar button is individually tabbable while the popover is open) — this is
now the **primary, recommended** path into the toolbar for keyboard/AT users, since it
moves real DOM focus and VoiceOver announces real focus reliably (unlike the
arrow-key/`aria-activedescendant` path in Case 8).

**Steps:** Select some text so the toolbar appears, then press `Tab`.

**Expected:**
- Real focus (and the VoiceOver cursor) lands on the **Bold** button; it's announced
  as "Bold, button" (not silence, not "not pressed" appearing out of nowhere on the
  wrong element).
- Pressing `Tab` again moves to the next button (e.g. Italic, then Link); `Shift+Tab`
  moves backward the same way. The automated case asserts the second Tab lands on another
  of the toolbar's own buttons and is announced as one, and that `Shift+Tab` returns to
  Bold — but not *which* tool is second, since tab order among the tools isn't asserted
  anywhere and hardcoding it here would make reordering them a test failure.
- The text selection itself may visually dim once focus leaves it (expected/normal —
  this no longer causes the toolbar to close, see Case 9).

**Result:** ☐ Pass ☐ Fail
**Notes:**

## Case 7 — Toolbar-available announcement (automated)

New: since the toolbar can appear without moving focus or the VoiceOver cursor,
nothing previously told a VoiceOver user it exists or that Tab now leads somewhere new.
A live region now announces its appearance once per open.

**Steps:** Select some text so the toolbar appears for the first time. Then, without
letting the toolbar close, extend or shrink the selection by one character (e.g.
`Shift+Right`/`Shift+Left`) a few times while it stays open.

**Steps (continued):** finally, collapse the selection so the toolbar closes, then select
text again.

**Expected:**
- On first appearance, VoiceOver announces something like "**Text formatting toolbar
  available. Press Tab to enter.**"
- Extending/shrinking the still-open selection does **not** repeat the announcement —
  it should only fire once per genuine open, not on every selection tweak (which would
  otherwise spam VoiceOver during a drag-select).
- Closing and reopening the toolbar **does** announce it again. This is the half that the
  "does not repeat" checks can't fail in: `InlineToolbarUI#show` only announces on a genuine
  hidden-to-shown transition, so a regression that left its visibility state stuck would make
  the toolbar silent for the rest of the session while every no-repeat assertion still passed.
  Covered in both `voiceover.spec.ts` (Case 7) and `aria.spec.ts` (at the live-region level).

**Regression to watch:** the live region must stay mounted across popover re-renders. It was
originally re-inserted on every render (`replaceChildren`) right before being written to — a
region that isn't already in the accessibility tree when its text changes is unreliable across
assistive tech. The automated case asserts the announcement was *both* filled into the DOM and
reached VoiceOver, so either half regressing is caught.

**Result:** ☐ Pass ☐ Fail
**Notes:**

## Case 8 — Inline toolbar arrow-key navigation without losing the selection (automated, **passing**)

DOM focus deliberately never moves onto the inline toolbar buttons via arrow keys (it
would drop the text selection in WebKit), so the highlighted item is only exposed via
`aria-activedescendant` on the blocks holder. Whether VoiceOver actually follows
`aria-activedescendant` set on a `contenteditable` `role="group"` ancestor — rather
than on the focused element itself in the way AT usually expects — is genuinely
uncertain. This is now a **secondary** path (Case 6's Tab entry is the reliable one),
so a gap here is lower-severity than it would otherwise be, but still worth recording.

> **This case was never run, and while it sat unrun the markup it covers was broken.**
> `aria-activedescendant` named an element that is not in the focused element's subtree —
> `EditorjsUI` appends the inline toolbar as a *sibling* of the blocks holder — which makes
> the reference invalid per ARIA and silently dropped rather than followed. It is fixed
> (`aria-owns` now claims the popover; see design.md), but the fix is verified only at the
> DOM level in `aria.spec.ts`. **Whether VoiceOver follows the reference once it resolves is
> still exactly what this case is for, and is still unanswered.**
>
> Worth noting what this cost: the case was left manual because the question looked like one
> only a screen reader could settle. It wasn't — the reference was invalid on structure alone,
> checkable in any browser without VoiceOver running, and the automated suite asserted the
> attribute's *value* instead of whether it resolved, so it passed throughout. When a case is
> deferred to a screen reader, it is worth asking first whether some part of it is decidable
> without one.

**Steps:** With text selected and the inline toolbar visible, press arrow keys to move through the toolbar buttons (do **not** click or Tab — use the same arrow-key path the automated test uses).

**Expected:**
- VoiceOver's focus ring / announcement moves through "Bold", "Italic", etc. as you press arrow keys, *without* the browser's DOM focus actually leaving the text (the text selection should still be visibly highlighted throughout).
- If VoiceOver does **not** announce the highlighted button at all (silence, or it just re-announces the paragraph/group), note it as a known gap rather than a regression — Case 6 (Tab) is the path that must work.

**Precondition (automated, passing):** `aria.spec.ts` asserts on both engines that the element
holding focus exposes `aria-owns` naming the popover, and that the item named by
`aria-activedescendant` sits inside it — so the reference resolves before this case is run. If
that assertion is failing, fix it first; there is nothing for VoiceOver to follow until it passes.

**Result: ☑ Follows.** Settled by a real run, and now asserted in `voiceover.spec.ts` rather than
left to a checklist. Measured output:

| Arrow step | `aria-activedescendant` → | VoiceOver said |
| --- | --- | --- |
| 1 | `ce-popover-item-2` (Bold) | `Bold toggle button` |
| 2 | `ce-popover-item-3` (Italic) | `Italic toggle button` |

Selection `"Hello world"` before and after, unchanged.

**VoiceOver does follow `aria-activedescendant` set on a contenteditable `role="group"`
ancestor.** Each step is announced as the item the reference names, DOM focus never leaves the
text, and the selection survives — which is the entire arrangement the inline toolbar depends on.
The secondary path works, so it is no longer only Case 6's `Tab` entry carrying the toolbar.

Three things this run also showed:

- **"toggle button", not "button"** — `aria-pressed` reaches speech on this path too, from
  ui-kit. Deliberately *not* asserted in Case 8: Case 5 & 6 owns the pressed state, and pinning it
  here would make this case fail for a reason unrelated to its subject.
- **Two arrow steps, not one, is what makes the result trustworthy.** `VO-Z` repeats the *last*
  spoken phrase, so a single matching reading could have been VoiceOver echoing something said
  before the arrow key arrived. Two steps naming different tools, each spoken in turn and neither
  still mentioning the other, is what rules that out. The test keeps both steps for this reason.
- **The announcement has to be waited for, not sampled once.** It is asynchronous and
  unsignalled: the arrow key changes the reference, and VoiceOver speaks whenever its queue
  reaches it. Asking `VO-Z` immediately after the keypress samples whatever was last *completed* —
  on a loaded machine, still `"Hello world selected"` from the click that opened the toolbar,
  which is how the first assertion-version of this case failed. It now polls `VO-Z` on a 1.5s
  interval up to 20s, unhurried on purpose, since `VO-Z` is itself speech and hammering it would
  interrupt the phrase being waited for.
- **VoiceOver's cursor has to be put on the element first, and getting that wrong only shows up
  in the full suite.** State is reported for the element VoiceOver's *own* cursor is on, and it
  does not observe Playwright's synthesized events — so the click that made the selection left the
  cursor wherever the previous case had it. Run alone, a fresh session's cursor was close enough
  and the case passed; run after sixteen other cases it was not, and VoiceOver sat on
  `"Hello world selected"` through the entire 20s poll. That failure is indistinguishable from
  "the feature does not work" without knowing this. `syncCursorToFocus()` before the arrow presses
  is the fix, and it is the rule the spec file's own header states; every other case that reads
  VoiceOver back after a page-driven focus change already followed it. The failure message now
  reports where the cursor was, so the next occurrence names its own cause.

**How this case stayed open so long is the lesson worth keeping.** It was recorded as a genuinely
unknowable question about screen reader behaviour. It wasn't: the reference named an element
outside the focused subtree, so nothing could have followed it, and that was checkable in any
browser with no screen reader running. The uncertainty was a broken-markup bug wearing the costume
of an open question — and the automated suite reported success throughout, because it asserted the
attribute's *value* instead of whether it resolved.

## Case 9 — Link tool: activating opens the URL input, doesn't close the toolbar (automated)

Originally reported as broken: activating the Link button just closed the whole
toolbar instead of opening its URL input. Root cause was the toolbar tearing itself
down when a button taking real focus collapsed the native text selection; fixed by
not treating focus moving to the toolbar's own controls as "the user dismissed it".

**Steps:** Select text, reach the **Link** button (via Tab, per Case 6, or click), and activate it.

**Expected:**
- A nested "**Add a link**" text input appears and the toolbar itself stays open — it
  does not disappear.
- The input is reachable/focusable and announced sensibly (e.g. "Add a link, text
  field").
- Typing a URL and pressing `Enter` applies the link and the toolbar/focus lands
  somewhere sensible afterward (not lost/stuck, not silently reverted).

**Result:** ☐ Pass ☐ Fail
**Notes:**

## Case 10 — After applying a tool, focus doesn't land on stray "invisible" content (automated)

Originally reported as: after applying a tool, VoiceOver's focus seemed to jump to
"the whole page", announcing something like "zero width space and 2 more items,
group". Root cause was a workaround `<span>` (used to stop Safari deleting empty
blocks) that was visually hidden but not hidden from the accessibility tree; combined
with the toolbar-teardown bug from Case 9. Both are now fixed.

**Steps:** Select text, apply Bold (via Tab + `Space`/`Return`, or click). Then explore
around the block with VoiceOver (`VO+Right`/`VO+Left`) a few times.

**Expected:**
- VoiceOver never announces "zero width space" or reads out invisible placeholder
  content as if it were part of the document.
- After applying the tool, VoiceOver's cursor/focus lands somewhere coherent — back in
  the paragraph text, or on the toolbar — not on the blocks holder as an undifferentiated
  "group" with phantom extra items.

**Result:** ☐ Pass ☐ Fail
**Notes:**

## Case 11 — Dismissing the inline toolbar (automated)

**Steps:** Tab into the toolbar, then click elsewhere / collapse the selection to dismiss it. Then
explore the editor with `VO+Right` from the top.

**Expected:** The user is put back in their document — the cursor lands on the block's own content,
not stranded on a control that no longer does anything — and nothing announces a phantom
`aria-activedescendant` reference.

**Observed — the tools stay reachable, and that is VoiceOver's residue, not the editor's.** A sweep
of the editor after dismissal still reaches an item whose entire text is "bold". This was
originally noted while writing Case 17, then mistakenly rewritten as "VoiceOver is answering from a
stale tree" on the strength of the DOM being clean — and re-established by this case failing:

| Checked | Result |
| --- | --- |
| Inline popover still in the DOM after dismissal? | **No** — `#hide()` destroys it, which detaches it |
| Bold exposed to `getByRole` after dismissal (chromium + webkit)? | **No** — count 0, both engines, whether or not Tab moved focus into the toolbar first |
| Bold reachable by VoiceOver's cursor after dismissal? | **Yes** |
| Does `resetCursor()` (`navigateToWebContent()` + round trip) clear it? | **No** |

The clean DOM is consistent with both explanations, which is what made the wrong one look settled.
The editor has done everything available to it; there is no navigation that makes the absence
observable from VoiceOver, so this case asserts where the user ends up instead. The DOM half is
covered headlessly by `aria.spec.ts` ("takes its tools out of the accessibility tree when
dismissed").

**Consequence for Case 17, and for anything else scanning near a block:** bound the scan with
`interact()`. Do not substitute "the toolbar is gone" for that — it's true and it doesn't help.

**Result:** ☐ Pass ☐ Fail
**Notes:**

## Case 12 — Several blocks are separate text fields (automated)

The first eleven cases all run against a document of exactly one block, where "the holder is not
a second text field" (Case 1) is nearly vacuous. This is the case that actually exercises what
per-block `role="textbox"` was added for.

**Steps:** Mount a multi-block document — `http://localhost:4173/?text=Alpha&text=Beta&text=Gamma` —
and `VO+Right` from the first block through the document.

**Expected:**
- Each block is announced as a text field of its own, named "Paragraph", carrying its own text.
- You reach Alpha, then Beta, then Gamma, in document order.
- No block is announced as inert text inside a larger editable region.

**Result:** ☐ Pass ☐ Fail
**Notes:**

## Case 13 — An empty block says what belongs in it (automated)

A `contenteditable` has no native `placeholder` attribute, so an empty block used to reach
VoiceOver as an unlabelled empty field — nothing indicated the editor was ready for input or what
to type. The paragraph tool now exposes its configured placeholder as `aria-placeholder`.

**Steps:** Mount an empty document — `http://localhost:4173/?text=` — and put VoiceOver on the block.

**Expected:** The block is announced as a "Paragraph" text field *and* the placeholder text
("Type text or press Tab" in the fixture) is announced.

**Result:** ☐ Pass ☐ Fail
**Notes:**

## Case 14 — Pressing Enter creates a block that is reachable (automated)

**Steps:** Put the caret at the end of the paragraph and press `Enter`. Then explore forward with
`VO+Right`.

**Expected:** A second, empty text field exists and VoiceOver reaches and announces it separately
from the first. The new block is empty, so what identifies it is the placeholder from Case 13 —
"a text field that isn't the first one" would also be satisfied by the link tool's URL input or
any other editable on the page, so the automated case matches on the placeholder instead.

**Known gap — deliberately not asserted:** nothing announces the new block *at the moment it is
created*. There is no live region for block creation and VoiceOver's cursor does not follow the
caret, so a user pressing Enter hears nothing and only discovers the new block by exploring. Worth
filing as follow-up work; the automated case asserts only that exploring finds it.

**Result:** ☐ Pass ☐ Fail
**Notes:**

## Case 15 — Activating the plus-button takes you into the menu (automated)

Originally written to check the other half of the `aria-expanded` round trip, which turned out not
to be observable — see Observed.

**Steps:** Reach the plus-button, activate it (`VO+Space`), then `VO+Left` back to the button while
the menu is still open.

**Expected:**
- Activating the button lands the VoiceOver cursor inside the menu, on its search field.
- The button stays reachable and named while the menu is open, so there is a way back to it.

**Observed:** VoiceOver reads the button as "Add block menu pop-up button" whether the menu is open
or closed — checked against both its item description and the phrase it actually speaks. The
`aria-expanded` state never reaches speech. (The automated case pins the open announcement against
the closed one on the **item description alone**: half of the fuller description is the last
*spoken* phrase, which can still be describing the previous stop, so an exact match on it would
fail on timing rather than on the state having changed.)

**Why — resolved by experiment, not assumed.** `aria-haspopup` suppresses the state. Isolated on a
scratch page varying one attribute at a time, five buttons deep:

| Button | Markup | VoiceOver said |
| --- | --- | --- |
| Alpha | `aria-expanded="true"` | "Alpha **expanded** button" |
| Bravo | `aria-expanded="false"` | "Bravo **collapsed** button" |
| Charlie | `+ aria-haspopup="menu"` | "Charlie menu pop-up button" |
| Delta | `+ aria-haspopup="menu" + aria-controls` → real `role="menu"` | "Delta menu pop-up button" |
| Echo | `+ aria-haspopup="true"` (legacy) | "Echo menu pop-up button" |

So VoiceOver supports `aria-expanded` perfectly well — it drops it the moment `aria-haspopup` is
present, switching to the "pop-up button" role wording instead. **`aria-controls` does not restore
it**, so the editor's missing button↔menu association is not the cause and adding one would not
help here. This is a VoiceOver limitation, not a defect in our markup.

**Not acted on, deliberately:** dropping `aria-haspopup` would make VoiceOver announce the state,
but at the cost of the popup relationship — and other screen readers announce both correctly
today, so optimising for VoiceOver would degrade them. The attributes stay as they are; the
`aria-expanded` round trip is asserted in `aria.spec.ts` at the DOM level, on open and dismissal
alike. If a future VoiceOver starts reporting state on pop-up buttons, this case can be tightened
into the round-trip assertion it was originally meant to be.

**Result:** ☐ Pass ☐ Fail
**Notes:**

## Case 16 — Dismissing the toolbox returns you to the plus-button (automated)

Originally broken in Safari only: pressing `Escape` (or inserting a block) closed the toolbox and
dropped DOM focus onto `<body>`, so the user lost their place in the editor. Safari does not focus
a `<button>` when it is clicked, so the popover had captured `document.body` as the element to
restore focus to. `ToolbarUI` now focuses the plus-button as it opens the toolbox.

**Steps:** Open the toolbox from the plus-button, then press `Escape`.

**Expected:**
- The menu closes and focus is back on the plus-button, which is announced by name.
- Its state reads collapsed again, not expanded.
- Focus is never silently on the page body — nothing should feel like it "jumped to the whole page".

**Result:** ☐ Pass ☐ Fail
**Notes:**

## Case 17 — Applied links sound like links (automated)

Case 9 stops once the URL input is open. This covers the other end: a tool that changes how text
*looks* has to change how it *sounds* too, or a screen-reader user has no way to know it's there.

**Steps:** Select text, reach the Link button (Tab, per Case 6), activate it, type a URL and press
`Enter`. Then move to the block and **interact with it** (`VO+Shift+Down`) before reading across
it — reading it from outside with `VO+Right` will not do, see Observed.

**Expected:** VoiceOver announces the formatted run as a link, not as plain text identical to
before.

**Observed — the path matters, and the reason is not our markup.** At the browse cursor VoiceOver
reads an editable field's value flat and never announces roles inside it, so the block is read as
"Hello world, Paragraph, text entry area" with no mention of a link. Interacting with the field
reveals it. Isolated on a scratch page holding the same link in four containers, one per row:

| Link inside | Announced at the browse cursor |
| --- | --- |
| ordinary `<p>` prose | yes |
| non-editable `role="group"` | yes |
| `role="textbox"` + `aria-multiline` + `contenteditable` (the editor's block) | no |
| `contenteditable` with **no** explicit role | no |

The last row is the one that matters: a plain `contenteditable` loses the link just as thoroughly,
so **`role="textbox"` is not responsible and this change did not regress link announcement**. It is
`contenteditable` itself, and it is VoiceOver's behavior for editable content rather than anything
the editor can attribute its way out of.

**Watch out when testing this by hand:** the inline toolbar's controls stay reachable to VoiceOver
after the toolbar is dismissed (see Case 11 — the DOM is clean, VoiceOver's tree isn't, and
re-navigating doesn't fix it), and their announcement is the bare tool name — the Link button reads
as "link". Reading *past* the block will therefore find the word "link" from the control that
applied the formatting rather than from the text. Interact with the block so the reading stays
inside it.

**Result:** ☐ Pass ☐ Fail
**Notes:**

## Case 18 — Filtered-out toolbox items are unreachable (automated)

`@editorjs/ui-kit` 2.0.0 puts a `hidden` attribute on items the toolbox search filters out, not
just a CSS class. This checks that the attribute does its job: a result the sighted user can no
longer see must not still be reachable by the virtual cursor.

**Steps:** Open the toolbox, type a query matching nothing into the search field, then explore the
popover with `VO+Right`.

**Expected:** No menu items are reachable while the query matches nothing (and they are, before you
type — otherwise the check proves nothing).

**Result:** ☐ Pass ☐ Fail
**Notes:**

---

## Summary

- **All 18 cases: passing in one run** against real VoiceOver, confirmed after the
  modified-arrow-key fix. The run before it failed seven cases (1, 2, 7, 11, 12, 13, 15) on the
  editor bug described in the fifth finding above; fixing it turned all seven green together,
  which is what confirms the diagnosis — a harness-flakiness explanation would not have moved
  them as a group. Cases 3, 11 and 15 reached the form recorded above during task 8.12, and
  Case 8 was settled after the `aria-owns` fix. Re-run with `yarn test:e2e:voiceover`
  (`packages/editorjs/e2e/tests/voiceover.spec.ts`).
- **Case 8: ☑ Follows.** The last case with no result, now run and asserted. VoiceOver announces
  each highlighted tool by name off `aria-activedescendant` alone, with the selection intact —
  see the case above for the measured output.
- Follow-ups outstanding before archiving:
  - **Publish `@editorjs/ui-kit` 2.0.0** and drop the local `link:` resolution — tasks.md 5a.2.
    Blocking: the branch does not install anywhere else until this is done.
  - Per-block identity for `aria-label="Paragraph"` once more block types exist — design.md
    Open Questions. Not blocking.
  - Inline toolbar not scoped per editor on chromium — tasks.md 10.5b. Pre-existing, pinned by a
    per-engine `test.fail()`, wants its own change. Not blocking.
- **Overall verdict: ☑ Needs follow-up work before archiving** (the dependency publish), ☐ Ship
  as-is. Screen-reader verification is complete: every case is automated, run, and passing in a
  single run, with no manual checklist left. What is outstanding is an npm publish, not an
  accessibility question. The suite earned its keep twice over — beyond settling Case 8, it
  caught a keyboard trap that no attribute-level assertion could have seen.
