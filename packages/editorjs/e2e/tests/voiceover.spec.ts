import { voiceOverTest as test } from '@guidepup/playwright';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { VoiceOverPlaywright } from '@guidepup/playwright';
import { PLACEHOLDER, mountDocument, selectParagraphText, tabToInlineTool } from '../support/editor.js';

/**
 * Automates the manual checklist in openspec/changes/add-editor-aria-semantics/voiceover-verification.md
 * against a real, running VoiceOver instance via Guidepup. macOS + Safari only - screen readers can't
 * drive a headless browser, so this suite has its own config (playwright.voiceover.config.ts) and is
 * excluded from the main `test:e2e` run. See e2e/README.md for how to run it locally.
 *
 * All 18 cases assert. Case 8 was the last one open - whether VoiceOver follows aria-activedescendant
 * set on a contenteditable role="group" ancestor - and a real run settled it: **it does**, naming each
 * highlighted tool in turn while DOM focus and the text selection stay put. It was never runnable
 * before `aria-owns` landed, since the reference named an element outside the focused subtree and
 * nothing could have followed it; it had been recorded as unknowable when the markup was simply broken.
 *
 * Every case mounts its own document rather than sharing a `beforeEach`: two of them need a document
 * other than the default, and every VoiceOver command costs a real second or so, so a mount thrown
 * away by the next line is not free the way it would be in the headless suite.
 *
 * Things learned from real runs shape the interaction pattern below:
 *
 * - Reaching and activating an item via VoiceOver's own commands (`.next()`/`.previous()`/`.act()`)
 *   reliably produces correct, fresh announcements - confirmed by Case 3 and Case 4. But
 *   `voiceOver.press()` for raw keys (Tab, Enter, Shift+Arrow) does not reliably deliver as a real
 *   keypress in this environment - it left `toBeFocused()` assertions timing out on elements that a
 *   `page.keyboard.press()` Tab reaches every time (proven separately by `aria.spec.ts`). So: use
 *   `voiceOver.next()`/`.previous()`/`.act()` to navigate and activate by VoiceOver's own cursor, and
 *   `page.keyboard`/`.click()` for anything that specifically needs to move real DOM focus (the Tab
 *   path itself is what Case 6 is testing) - then read the result back through `voiceOver`.
 * - Reading it back requires one extra step: VoiceOver does not observe Playwright's synthesized
 *   events at all, so after a `page`-driven focus change its cursor is still on the previous item
 *   and describes that instead. `syncCursorToFocus()` points it at the focused element first.
 * - The same staleness applies to the *page*, not just the cursor: until VoiceOver runs a navigation
 *   command of its own it keeps answering from the accessibility tree it had before, so a scan taken
 *   straight after a page-driven DOM change can describe elements that are already gone. Anything
 *   reading the page back after such a change has to go through `resetCursor()` first, which pairs
 *   `navigateToWebContent()` with the navigation command that refreshes it - mid-test resets need it
 *   just as much as the initial mount does. This is what makes Cases 11 and 18 deterministic.
 * - A focus change caused by VoiceOver's *own* command is the opposite - it does follow that one.
 *   `act()` on the plus button lands the cursor in the toolbox's search field, not on the button
 *   it just activated, so anything that wants the activated control back has to walk backward.
 * - `spokenPhraseLog()` is not a live tap on VoiceOver's speech. Guidepup samples the last spoken
 *   phrase only while executing one of its own commands and appends it to a store; the getter just
 *   returns that store. So polling it in a loop can never observe anything - without a command
 *   nothing is ever sampled - and speech triggered by the page alone (a live region, say) has to be
 *   pulled in by issuing a command afterwards, e.g. VO-Z (`repeatLastSpokenPhrase`).
 */

/**
 * How VoiceOver names the textbox role. It says "text entry area" for the editor's
 * `role="textbox"` + `aria-multiline="true"` contenteditable in Safari; the other two wordings
 * are what it uses for single-line and legacy cases, kept so a verbosity or OS difference
 * doesn't read as a regression.
 */
const TEXTBOX_ROLE = /text field|edit text|text entry area/;

/**
 * How far after a tool's name its pressed state can appear before the match stops counting.
 * Wide enough for the shortcut VoiceOver reads in between ("Bold ⌘+B selected"), narrow enough
 * that the two have to belong to the same announcement.
 */
const STATE_PROXIMITY = 40;

/**
 * How VoiceOver reports `aria-pressed="true"` for the tool named `name`.
 *
 * It maps the ARIA pressed state onto its own toggle vocabulary - a pressed toolbar button reads
 * as "Bold selected, toggle button", not "pressed" - so the literal word never appears; it's kept
 * in the pattern only so a verbosity or OS difference doesn't read as a regression.
 *
 * Anchored to the tool's own name rather than matching the bare word, because the toolbar only
 * exists while text is *selected*: an unanchored /selected/ can be satisfied by VoiceOver
 * describing the selection instead of the button, which would make the positive assertion pass
 * without the state being exposed at all and the negative one fail without it being exposed either.
 * @param name - the tool's accessible name, lowercased
 */
function pressedState(name: string): RegExp {
  return new RegExp(`${name}[\\s\\S]{0,${STATE_PROXIMITY}}?(selected|pressed)`);
}

/**
 * Inline tool names, for asserting that no tool is reachable anymore.
 *
 * Bold and Italic only: they can't occur in the fixture's text, where "link" is a common enough
 * word that a future fixture change could make a genuine absence look like a leftover control.
 */
const INLINE_TOOL_NAME = /\bbold\b|\bitalic\b/;

/**
 * VoiceOver's spoken-phrase log mixes in caret/typing chatter, and itemText() alone doesn't
 * necessarily carry every bit of state VoiceOver announces (e.g. popup/pressed state) - so
 * assertions check both combined rather than betting on one or the other.
 * @param voiceOver - Guidepup VoiceOver controller
 */
async function describeCurrentItem(voiceOver: VoiceOverPlaywright): Promise<string> {
  const [item, phrase] = await Promise.all([voiceOver.itemText(), voiceOver.lastSpokenPhrase()]);

  return `${item} ${phrase}`.toLowerCase();
}

/** Test-only channel for the recorded live-region announcements. */
interface AnnouncementWindow extends Window {
  /** Messages the inline toolbar's live region has been filled with, in order. */
  inlineToolbarAnnouncements?: string[];
}

/**
 * Starts recording every message the inline toolbar's live region is filled with.
 *
 * The region is emptied and refilled on each announcement, so one announcement is one
 * non-empty fill - which makes a repeat countable at the source, where VoiceOver's spoken
 * phrase log only shows identical text twice.
 * @param page - Playwright page the editor is mounted on
 * @returns getter for the messages recorded so far, in order
 */
async function trackAnnouncements(page: Page): Promise<() => Promise<string[]>> {
  await page.evaluate(() => {
    const recorded: string[] = [];

    (window as AnnouncementWindow).inlineToolbarAnnouncements = recorded;

    const announcerSelector = '[data-testid="inline-toolbar-announcer"]';

    new MutationObserver((mutations) => {
      // The observer has to watch the whole body - the toolbar (and its live region) is created
      // and destroyed per selection - so mutations from anywhere else have to be filtered out.
      // Without this, any unrelated DOM change while the region held a message would record a
      // phantom repeat.
      const touchedAnnouncer = mutations.some((mutation) => {
        const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;

        return target?.closest(announcerSelector) != null;
      });

      if (!touchedAnnouncer) {
        return;
      }

      const message = document.querySelector(announcerSelector)?.textContent?.trim();

      if (message !== undefined && message !== '') {
        recorded.push(message);
      }
    }).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });

  return async () => page.evaluate(() => (window as AnnouncementWindow).inlineToolbarAnnouncements ?? []);
}

/**
 * Points VoiceOver's cursor at whatever currently holds real DOM focus (VO-Shift-F4).
 *
 * Playwright's synthesized key events move real focus - `toBeFocused()` confirms it - but
 * VoiceOver doesn't observe them, so it keeps describing wherever its own cursor was left.
 * This is VoiceOver's own command, delivered through the same channel as `next()`/`act()`
 * (which are reliable here), unlike `voiceOver.press()` for plain keys (which isn't).
 * @param voiceOver - Guidepup VoiceOver controller
 */
async function syncCursorToFocus(voiceOver: VoiceOverPlaywright): Promise<void> {
  await voiceOver.perform(voiceOver.keyboardCommands.moveCursorToKeyboardFocus);
}

/** Upper bound when looking for a specific item, so a missing one fails fast instead of hanging. */
const FIND_MAX_STEPS = 40;

/**
 * Moves VoiceOver's own cursor - not Playwright's DOM focus - until the current item's text
 * matches `pattern`, mirroring how a VoiceOver user explores the page (VO+Right repeatedly)
 * rather than jumping straight to a known element.
 *
 * Returns what was announced at every stop along the way, including the matching one, so a case
 * that cares about what a user meets *en route* (Case 3, reaching the plus button through its
 * toolbar) doesn't have to walk the same ground twice.
 * @param voiceOver - Guidepup VoiceOver controller
 * @param pattern - matched against the current item's text after each step
 * @param direction - `next` (VO+Right) or `previous` (VO+Left)
 * @param maxSteps - upper bound so a missing item fails fast instead of hanging
 */
async function walkTo(
  voiceOver: VoiceOverPlaywright,
  pattern: RegExp,
  direction: 'next' | 'previous' = 'next',
  maxSteps = FIND_MAX_STEPS
): Promise<string[]> {
  const descriptions: string[] = [];

  for (let step = 0; step < maxSteps; step++) {
    const item = await voiceOver.itemText();

    descriptions.push(`${item} ${await voiceOver.lastSpokenPhrase()}`.toLowerCase());

    // Matched against the item text alone: the fuller description folds in the last *spoken*
    // phrase, which can still be describing the previous stop and would stop the walk short.
    if (pattern.test(item)) {
      return descriptions;
    }

    if (direction === 'next') {
      await voiceOver.next();
    } else {
      await voiceOver.previous();
    }
  }

  throw new Error(`VoiceOver did not reach an item matching ${pattern.toString()} within ${maxSteps} ${direction} steps`);
}

/**
 * Moves VoiceOver's cursor to the first item matching `pattern`, discarding the route.
 * @param voiceOver - Guidepup VoiceOver controller
 * @param pattern - matched against the current item's text after each step
 * @param direction - `next` (VO+Right) or `previous` (VO+Left)
 */
async function findItem(
  voiceOver: VoiceOverPlaywright,
  pattern: RegExp,
  direction: 'next' | 'previous' = 'next'
): Promise<void> {
  await walkTo(voiceOver, pattern, direction);
}

/**
 * Sends VoiceOver's cursor back to the start of the web content, ready to be read from.
 *
 * `navigateToWebContent()` on its own is not enough: it leaves VoiceOver latched onto whatever it
 * first landed on, so the next `itemText()` can still describe the page as it was before the last
 * DOM change - anything driven from `page` is invisible to VoiceOver until it runs a navigation
 * command of its own. Round-tripping forward and back is that command, and leaves the logical
 * cursor position unchanged. Anything that resets the cursor mid-test has to do this too, not just
 * the initial mount; sampling straight after the reset is what made Case 18 non-deterministic.
 * @param voiceOver - Guidepup VoiceOver controller
 */
async function resetCursor(voiceOver: VoiceOverPlaywright): Promise<void> {
  // Also clears the spoken-phrase/item-text logs.
  await voiceOver.navigateToWebContent();

  await voiceOver.next();
  await voiceOver.previous();
}

/**
 * Loads the fixture and puts VoiceOver's cursor on the editor's first block.
 * @param page - Playwright page to mount the editor on
 * @param voiceOver - Guidepup VoiceOver controller
 * @param search - query string to mount with, e.g. `?text=Alpha&text=Beta`
 */
async function mountEditor(page: Page, voiceOver: VoiceOverPlaywright, search = ''): Promise<void> {
  await mountDocument(page, search);

  await resetCursor(voiceOver);
}

/**
 * The paragraph is the very first item in the editor's web content, so a forward walk long
 * enough to leave it behind covers everything a user would meet on the way out.
 */
const FORWARD_WALK_STEPS = 6;

/** Long enough for a forward walk to leave a three-block document behind. */
const MULTI_BLOCK_WALK_STEPS = 12;

/** Enough stops to get from the toolbox's search field back out to the button that opened it. */
const BACKWARD_WALK_STEPS = 6;

/** Stops to read across inside the block once interacting with it. */
const INSIDE_BLOCK_STEPS = 6;

/** Upper bound for a full sweep of the editor's web content, both when looking for an item and when proving one is absent. */
const SCAN_STEPS = 25;

/**
 * Steps VoiceOver's cursor and returns what it announced at each stop, lowercased.
 *
 * Several cases below are about what a user meets while exploring rather than about one
 * specific stop - which item carries a given piece of state isn't something a test should
 * hardcode - so they assert over the whole walk instead of a single `itemText()`.
 * @param voiceOver - Guidepup VoiceOver controller
 * @param steps - how many times to move the cursor
 * @param direction - `next` (VO+Right) or `previous` (VO+Left)
 */
async function walk(
  voiceOver: VoiceOverPlaywright,
  steps: number,
  direction: 'next' | 'previous' = 'next'
): Promise<string[]> {
  const items: string[] = [];

  for (let step = 0; step < steps; step++) {
    if (direction === 'next') {
      await voiceOver.next();
    } else {
      await voiceOver.previous();
    }

    items.push((await voiceOver.itemText()).toLowerCase());
  }

  return items;
}

/**
 * Like `walk`, but records where the cursor already is before moving it.
 *
 * The difference matters whenever the item the cursor starts on is part of what's being
 * examined: `walk` answers "what is ahead of here" and `sweep` answers "what is reachable from
 * here". A case proving something is *absent* wants the second, and so does any guard checking
 * that the scan really covered the editor - `resetCursor` leaves the cursor on the first block,
 * which `walk` would step straight past and never record.
 * @param voiceOver - Guidepup VoiceOver controller
 * @param steps - how many stops to record
 * @param direction - `next` (VO+Right) or `previous` (VO+Left)
 */
async function sweep(
  voiceOver: VoiceOverPlaywright,
  steps: number,
  direction: 'next' | 'previous' = 'next'
): Promise<string[]> {
  const items: string[] = [];

  for (let step = 0; step < steps; step++) {
    items.push((await voiceOver.itemText()).toLowerCase());

    if (direction === 'next') {
      await voiceOver.next();
    } else {
      await voiceOver.previous();
    }
  }

  return items;
}

/**
 * Like `walk`, but records the full description at each stop rather than the item text alone.
 *
 * Kept separate because most walks are looking for *which* item they reached, and folding in
 * the last spoken phrase - which can still be describing a previous stop - would make that
 * ambiguous. Use this one when the question is what a user hears, not where they are.
 * @param voiceOver - Guidepup VoiceOver controller
 * @param steps - how many times to move the cursor
 * @param direction - `next` (VO+Right) or `previous` (VO+Left)
 */
async function describeWalk(
  voiceOver: VoiceOverPlaywright,
  steps: number,
  direction: 'next' | 'previous' = 'next'
): Promise<string[]> {
  const descriptions: string[] = [];

  for (let step = 0; step < steps; step++) {
    if (direction === 'next') {
      await voiceOver.next();
    } else {
      await voiceOver.previous();
    }

    descriptions.push(await describeCurrentItem(voiceOver));
  }

  return descriptions;
}

test('Case 1: exposes the paragraph as the only text field, with no editable region wrapping it', async ({ page, voiceOver }) => {
  await mountEditor(page, voiceOver);

  const paragraphDescription = await describeCurrentItem(voiceOver);

  expect(paragraphDescription).toContain('paragraph');
  expect(paragraphDescription).toMatch(TEXTBOX_ROLE);

  // VoiceOver never surfaces the blocks holder as an item of its own: an unnamed role="group"
  // is structurally transparent to the virtual cursor (it's not a landmark and has no name to
  // announce), which is why a backward scan for "group" found nothing and why stopInteracting()
  // from here jumps straight out of the whole web content rather than up into a group level.
  // So the holder's role isn't directly assertable through VoiceOver - what *is* assertable is
  // the effect the role change was made for: no second, outer editable region. aria.spec.ts
  // covers the role="group" attribute itself.
  //
  // Backward first: the paragraph is the first item VoiceOver reaches, so previous() is a hard
  // no-op. Before role="group", the holder's contenteditable was implicitly a textbox and would
  // have been the item you landed on ahead of it.
  const beforeStepBack = await voiceOver.itemText();

  // Anchors the no-op below. "Nothing is exposed ahead of the block" only follows from a
  // stationary cursor while the block really is where the cursor starts; if the fixture ever
  // mounts anything above the editor, the step back becomes a real move between two unrelated
  // items and quietly proves nothing. This fails loudly in that case instead.
  expect(beforeStepBack.toLowerCase()).toContain('hello world');

  await voiceOver.previous();

  expect(await voiceOver.itemText()).toBe(beforeStepBack);

  // Forward: walking out of the paragraph must not meet another text field either.
  const itemsAhead = await walk(voiceOver, FORWARD_WALK_STEPS);

  expect(itemsAhead.filter(item => TEXTBOX_ROLE.test(item))).toEqual([]);
});

test('Case 2: announces the paragraph by name and role, and lets VoiceOver users type', async ({ page, voiceOver }) => {
  await mountEditor(page, voiceOver);

  const paragraph = page.getByRole('textbox', { name: 'Paragraph' });

  const phrase = await describeCurrentItem(voiceOver);

  expect(phrase).toContain('paragraph');
  expect(phrase).toMatch(TEXTBOX_ROLE);

  // VoiceOver's cursor sitting on the paragraph does not put the caret in it, and
  // voiceOver.press()/type() don't reliably deliver as real keystrokes here (same finding as
  // the header comment - the text was left untouched). Type the way e2e/README.md prescribes:
  // a real click to place the caret, then page.keyboard.
  await paragraph.click();
  await page.keyboard.press('End');
  await page.keyboard.type('!');

  await expect(paragraph).toHaveText('Hello world!');

  // The multiline half of the checklist item: VoiceOver must still see one editable field
  // holding the whole text, not a line-truncated one. Whether it *echoes* the typed character
  // is a VoiceOver typing-echo preference, not something aria-multiline affects, so it isn't
  // asserted here.
  await voiceOver.next();
  await voiceOver.previous();

  const afterTyping = await describeCurrentItem(voiceOver);

  expect(afterTyping).toContain('hello world!');
  expect(afterTyping).toMatch(TEXTBOX_ROLE);
});

test('Case 3: announces the plus-button with its popup relationship', async ({ page, voiceOver }) => {
  await mountEditor(page, voiceOver);

  const onTheWay = await walkTo(voiceOver, /add block/i);
  const phrase = onTheWay[onTheWay.length - 1];

  expect(phrase).toContain('add block');
  expect(phrase).toMatch(/menu/);

  // The checklist's third expectation - that the button is identifiable as part of a toolbar
  // named "Block actions" - is pinned inverted rather than dropped, so that a VoiceOver version
  // which does start announcing it fails here and prompts this back into a real assertion.
  // Observed: the cursor goes from the block straight onto the button in a single
  // step, announcing "add block menu pop-up button" and nothing about a container; the whole
  // route from the block to the button contains no mention of the toolbar at all.
  //
  // This was an inference that turned out to be wrong, not a regression. Case 1 establishes that
  // the *unnamed* blocks holder is transparent to the virtual cursor because it has no name to
  // announce, and the reasonable-looking converse - that a named container therefore is
  // announced - simply does not hold for linear VO+Right navigation. Whether VoiceOver's group
  // navigation or the rotor would surface the name was not tested; the browse cursor is the path
  // these cases are about.
  //
  // The name itself is correct and asserted at the DOM level in aria.spec.ts, so what is
  // untestable here is VoiceOver's reporting of it, not the editor's markup. Same disposition as
  // the `aria-expanded` finding in Case 15, and recorded alongside it in voiceover-verification.md.
  expect(onTheWay.join(' | ')).not.toContain('block actions');
});

test.describe('Case 4: toolbox menu', () => {
  test('announces the named menu and lets VoiceOver reach and activate an item', async ({ page, voiceOver }) => {
    await mountEditor(page, voiceOver);

    await findItem(voiceOver, /add block/i);
    await voiceOver.act();

    const menu = page.getByRole('menu', { name: 'Add block' });

    await expect(menu).toBeVisible();

    await voiceOver.clearSpokenPhraseLog();
    await findItem(voiceOver, /text/i);

    // Aggregated over the whole scan rather than a single moment, since it's the menu
    // container and/or its search field that carry the "menu"/"search" wording, and
    // exactly which item announces it first isn't something this test should hardcode.
    const menuLog = (await voiceOver.spokenPhraseLog()).join(' ').toLowerCase();

    expect(menuLog).toMatch(/menu|search/);

    const itemPhrase = await describeCurrentItem(voiceOver);

    expect(itemPhrase).toContain('text');

    await voiceOver.act();

    await expect(page.getByRole('textbox', { name: 'Paragraph' })).toHaveCount(2);

    // Activating an item has to finish the interaction, not just insert: a menu left open over
    // the document, or a user dropped onto <body>, is how "focus jumped to the whole page" felt
    // in the original report. Which element ends up focused is deliberately not pinned - that is
    // the subject of the todo aria.spec.ts marks `test.fail()` - only that it is a real one.
    await expect(menu).toBeHidden();

    const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? 'NONE');

    expect(['BODY', 'HTML', 'NONE']).not.toContain(focusedTag);

    // And VoiceOver still has somewhere to be afterwards, rather than being left describing the
    // menu it just closed.
    await resetCursor(voiceOver);

    expect((await describeCurrentItem(voiceOver)).trim().length).toBeGreaterThan(0);
  });
});

test.describe('Case 5 & 6: inline toolbar', () => {
  test('is reachable and traversable via Tab, and reports the applied formatting through aria-pressed', async ({ page, voiceOver }) => {
    await mountEditor(page, voiceOver);
    await selectParagraphText(page);

    const inlineToolbar = page.getByRole('toolbar', { name: 'Text formatting' });

    await expect(inlineToolbar).toBeVisible();

    await page.keyboard.press('Tab');

    const boldButton = page.getByRole('button', { name: 'Bold' });

    await expect(boldButton).toBeFocused();
    await syncCursorToFocus(voiceOver);

    const unpressedPhrase = await describeCurrentItem(voiceOver);

    expect(unpressedPhrase).toContain('bold');
    expect(unpressedPhrase).toContain('button');
    expect(unpressedPhrase).not.toMatch(pressedState('bold'));

    // Tab keeps moving through the toolbar and Shift+Tab comes back, which is the rest of what
    // makes this the recommended path in for keyboard and AT users. Which tool is second is
    // deliberately not pinned - tab order among the tools isn't asserted anywhere - only that
    // the step lands on another of the toolbar's own buttons and is announced as one.
    await page.keyboard.press('Tab');

    await expect(boldButton).not.toBeFocused();

    const focusedInsideToolbar = await inlineToolbar.evaluate(
      toolbar => document.activeElement !== null && toolbar.contains(document.activeElement)
    );

    expect(focusedInsideToolbar).toBe(true);

    await syncCursorToFocus(voiceOver);

    expect(await describeCurrentItem(voiceOver)).toContain('button');

    await page.keyboard.press('Shift+Tab');

    await expect(boldButton).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(boldButton).toHaveAttribute('aria-pressed', 'true');

    // The popover is rebuilt on every selection change, so re-selecting the now-bold text is
    // what produces the updated aria-pressed state.
    await selectParagraphText(page);
    await page.keyboard.press('Tab');

    await expect(page.getByRole('button', { name: 'Bold' })).toBeFocused();
    await syncCursorToFocus(voiceOver);

    expect(await describeCurrentItem(voiceOver)).toMatch(pressedState('bold'));
  });
});

/** Settling window for asserting an announcement did *not* happen. */
const NO_ANNOUNCEMENT_SETTLE = 1_000;

test('Case 7: announces the toolbar becoming available exactly once per open', async ({ page, voiceOver }) => {
  await mountEditor(page, voiceOver);

  // "Exactly once" is counted at the source rather than inferred from VoiceOver's speech log:
  // InlineToolbarUI#announce clears the live region and fills it back in on a timer, so a
  // repeat is a second fill - visible here as a second recorded entry, but indistinguishable
  // from the first in a log of spoken phrases.
  const announcements = await trackAnnouncements(page);
  const message = 'Text formatting toolbar available. Press Tab to enter.';
  const inlineToolbar = page.getByRole('toolbar', { name: 'Text formatting' });

  await voiceOver.clearSpokenPhraseLog();

  await selectParagraphText(page);

  await expect(inlineToolbar).toBeVisible();

  await expect.poll(announcements).toEqual([message]);

  // The live region carrying the message is only half of it - VoiceOver has to actually speak
  // it. Getting that into the log takes a command: Guidepup only samples VoiceOver's speech
  // as part of executing one (see the header comment), so polling spokenPhraseLog() on its own
  // can never observe an announcement that nothing asked for. VO-Z re-speaks the last phrase,
  // which is the announcement if VoiceOver picked the live region up - and is captured because
  // it goes through a command.
  await voiceOver.perform(voiceOver.keyboardCommands.repeatLastSpokenPhrase);

  expect((await voiceOver.spokenPhraseLog()).join(' ')).toContain('Text formatting toolbar available');

  // Shrinks and grows the selection while it stays open and non-empty - the toolbar's popover
  // rebuilds on every change, but the "available" announcement must not repeat.
  await page.keyboard.press('Shift+ArrowLeft');
  await page.keyboard.press('Shift+ArrowRight');

  await expect(inlineToolbar).toBeVisible();
  await page.waitForTimeout(NO_ANNOUNCEMENT_SETTLE);

  expect(await announcements()).toHaveLength(1);

  // The other half of "per open", and the direction the assertions above can't fail in:
  // InlineToolbarUI#show only announces on a genuine hidden-to-shown transition, so a
  // regression leaving its visibility state stuck would make the toolbar silent for the rest of
  // the session while every "does not repeat" check above still passed.
  await page.getByRole('textbox', { name: 'Paragraph' }).click();

  await expect(inlineToolbar).toBeHidden();

  await selectParagraphText(page);

  await expect(inlineToolbar).toBeVisible();
  await expect.poll(announcements).toEqual([message, message]);
});

/** What the focused element points at via aria-activedescendant, at one moment. */
interface ActiveDescendantReading {
  /** Value of aria-activedescendant, or null when nothing is highlighted */
  id: string | null;

  /** Accessible name of the element that id resolves to, so a reading names a tool rather than an id */
  name: string | null;

  /** Whether the reference is followable at all: it names a real element inside the claimed subtree */
  resolves: boolean;
}

/**
 * Reads back what the focused element currently points at, and what that resolves to.
 *
 * The name is read off the element rather than assumed from the press count: which item a given
 * number of arrow presses lands on is ui-kit's business, and pinning it here would make this
 * measurement fail for a reason that has nothing to do with what it measures.
 * @param page - Playwright page the editor is mounted on
 * @returns the id pointed at, the accessible name it resolves to, and whether the reference is followable
 */
async function readActiveDescendant(page: Page): Promise<ActiveDescendantReading> {
  return page.evaluate(() => {
    const focused = document.activeElement as HTMLElement | null;
    const id = focused?.getAttribute('aria-activedescendant') ?? null;
    const ownsId = focused?.getAttribute('aria-owns') ?? null;
    const item = id !== null ? document.getElementById(id) : null;
    const owned = ownsId !== null ? document.getElementById(ownsId) : null;

    return {
      id,
      name: item?.getAttribute('aria-label') ?? item?.textContent?.trim() ?? null,
      /** Followable means: named, and inside the subtree the focused element claims */
      resolves: item !== null && owned !== null && owned.contains(item),
    };
  });
}

/** Arrow presses taken, so that a second, different tool proves the reference is being tracked. */
const ACTIVEDESCENDANT_STEPS = 2;

/**
 * How long to wait for VoiceOver to get round to announcing a newly highlighted item.
 *
 * The announcement is asynchronous and unsignalled: the arrow key changes `aria-activedescendant`,
 * VoiceOver notices, and it speaks whenever its queue reaches it. A single `VO-Z` straight after
 * the keypress samples whatever was last *completed* instead - on a loaded machine that is still
 * the selection announcement from the click that opened the toolbar ("Hello world selected"),
 * which is exactly how this case first failed. Asking repeatedly is the only way to tell
 * "VoiceOver does not announce this" apart from "VoiceOver has not announced it yet".
 */
const ANNOUNCEMENT_TIMEOUT = 20_000;

/**
 * How long to leave VoiceOver alone between asks. Load-bearing, not a politeness: `VO-Z` is itself
 * speech, so polling it tightly would keep interrupting the very phrase being waited for.
 */
const ANNOUNCEMENT_INTERVAL = 1_500;

/** One arrow step: the tool the reference named, and what VoiceOver said about it. */
interface HighlightReading {
  /** Accessible name of the item `aria-activedescendant` pointed at, lowercased */
  name: string;

  /** VoiceOver's spoken phrase log for that step, joined and lowercased */
  spoken: string;
}

test('Case 8: announces the highlighted inline tool without moving focus off the text', async ({ page, voiceOver }) => {
  /**
   * The open question this whole change carried, now settled by a real run: **VoiceOver does
   * follow `aria-activedescendant` set on the contenteditable `role="group"` blocks holder.**
   * Arrowing to Bold is announced "Bold toggle button", arrowing on to Italic "Italic toggle
   * button" - each naming exactly the item the reference points at, with DOM focus never leaving
   * the text and the selection intact throughout.
   *
   * Two things worth keeping in view:
   * - It could not have worked before `aria-owns` landed. The reference named an element outside
   *   the focused subtree, so there was nothing for VoiceOver to resolve; the case had been left
   *   unrun on the grounds that the answer was unknowable, when in fact the markup was broken.
   * - "toggle button" rather than "button" is `aria-pressed` reaching speech on this path too,
   *   which is ui-kit's doing. Not asserted here - Case 5 & 6 owns the pressed state, and pinning
   *   it in this case would make it fail for a reason that has nothing to do with its subject.
   */
  await mountEditor(page, voiceOver);
  await selectParagraphText(page);

  const inlineToolbar = page.getByRole('toolbar', { name: 'Text formatting' });

  await expect(inlineToolbar).toBeVisible();

  const blocksHolder = page.getByRole('group');

  // The holder is the outermost contenteditable, so it is what keeps focus - which is why the
  // reference has to live there rather than on the block. Covered headlessly in aria.spec.ts.
  await expect(blocksHolder).toBeFocused();
  await expect(blocksHolder).not.toHaveAttribute('aria-activedescendant');

  /**
   * Load-bearing, and the reason this case first failed in the suite while passing on its own.
   *
   * `aria-activedescendant` is only reported for the element VoiceOver is actually watching, and
   * the selection above was made by a Playwright click - an event VoiceOver does not observe at
   * all, so its cursor is still wherever the previous case left it. Run alone that happened to be
   * close enough to the block for the announcement to come through; run after sixteen other
   * cases it was not, and VoiceOver sat on "Hello world selected" through twenty seconds of
   * asking. This is the rule in this file's header, and every other case that reads VoiceOver
   * back after a page-driven focus change already follows it
   */
  await syncCursorToFocus(voiceOver);

  /** Captured once, purely so a future failure says where VoiceOver was looking when it happened */
  const cursorAt = await describeCurrentItem(voiceOver);

  const selectionBefore = await page.evaluate(() => window.getSelection()?.toString() ?? '');

  const heard: HighlightReading[] = [];

  /**
   * Two steps, not one. A single reading cannot tell "VoiceOver announced the highlighted item"
   * apart from "VoiceOver happened to still be saying something about the toolbar" - but if it
   * follows the reference, the second step names a different tool than the first
   */
  for (let step = 0; step < ACTIVEDESCENDANT_STEPS; step++) {
    await voiceOver.clearSpokenPhraseLog();

    await page.keyboard.press('ArrowDown');

    const pointed = await readActiveDescendant(page);

    expect(pointed.id).not.toBeNull();
    expect(pointed.resolves).toBe(true);
    expect(pointed.name).not.toBeNull();

    const name = (pointed.name as string).toLowerCase();

    /**
     * The finding itself: what VoiceOver speaks is the item the reference names. Compared against
     * the name read off the element rather than a hardcoded 'bold'/'italic', since which tool a
     * given press count lands on is ui-kit's business and pinning it here would make this case
     * fail for a reason unrelated to its subject.
     *
     * VoiceOver only samples speech while executing a command, so an announcement nothing asked
     * for can never appear in the log on its own - VO-Z re-speaks the last phrase *through* a
     * command, which is how Case 7 captures the live-region announcement. Polled rather than
     * asked once, because the announcement is asynchronous and nothing signals its arrival: this
     * waits for VoiceOver to say the name, and fails only if it never does
     */
    await expect
      .poll(async () => {
        await voiceOver.perform(voiceOver.keyboardCommands.repeatLastSpokenPhrase);

        return (await voiceOver.lastSpokenPhrase()).toLowerCase();
      }, {
        timeout: ANNOUNCEMENT_TIMEOUT,
        intervals: [ANNOUNCEMENT_INTERVAL],
        message: `VoiceOver never announced "${name}", the item aria-activedescendant points at.`
          + ` Its cursor was on: "${cursorAt.trim()}" - if that is not the editor's text, the`
          + ` cursor drifted and the reference was never being watched, not unreported.`,
      })
      .toContain(name);

    /** Already sampled by the poll's last command, so reading it back costs nothing */
    const spoken = (await voiceOver.lastSpokenPhrase()).toLowerCase();

    expect(spoken).toContain('button');

    heard.push({
      name,
      spoken,
    });
  }

  /**
   * Guards the vacuous reading, and matters more now that the announcement is polled for. VO-Z
   * repeats the *last* phrase, so one step matching could in principle be VoiceOver echoing
   * something it happened to have said already rather than reacting to the arrow key. Two steps
   * landing on different tools, each spoken in turn and neither still mentioning the other, is
   * what shows the reference is being tracked rather than a stale phrase replayed
   */
  expect(heard[0].name).not.toBe(heard[1].name);
  expect(heard[1].spoken).not.toContain(heard[0].name);

  /**
   * Keeping the selection intact is the entire reason the toolbar refuses DOM focus and needs
   * `aria-activedescendant` at all, so if arrow navigation drops it the design's premise is
   * broken however well the announcement reads
   */
  const selectionAfter = await page.evaluate(() => window.getSelection()?.toString() ?? '');

  expect(selectionAfter).toBe(selectionBefore);
  expect(selectionAfter).not.toBe('');
});

test('Case 9: activating the Link tool opens its URL input without closing the toolbar', async ({ page, voiceOver }) => {
  await mountEditor(page, voiceOver);
  await selectParagraphText(page);

  const inlineToolbar = page.getByRole('toolbar', { name: 'Text formatting' });

  await expect(inlineToolbar).toBeVisible();

  await tabToInlineTool(page, page.getByRole('button', { name: 'Link' }));

  await page.keyboard.press('Enter');

  await expect(inlineToolbar).toBeVisible();

  const linkInput = page.getByRole('textbox', { name: 'Add a link' });

  await expect(linkInput).toBeFocused();
  await syncCursorToFocus(voiceOver);

  expect(await describeCurrentItem(voiceOver)).toContain('add a link');
});

test('Case 10: does not announce invisible placeholder content after applying a tool', async ({ page, voiceOver }) => {
  await mountEditor(page, voiceOver);
  await selectParagraphText(page);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  // Confirms Bold actually got applied before scanning - otherwise a silently-failed
  // Tab+Enter would make the "no stray content" check below pass for the wrong reason.
  await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');

  await voiceOver.clearSpokenPhraseLog();

  await voiceOver.next();
  await voiceOver.next();
  await voiceOver.next();

  const log = await voiceOver.spokenPhraseLog();

  // Guards against a vacuous pass: `next()` must have actually produced some
  // announcements for "doesn't contain zero width space" to mean anything.
  expect(log.join('').trim().length).toBeGreaterThan(0);
  expect(log.join(' ').toLowerCase()).not.toContain('zero width space');
});

test('Case 11: leaves the user in the document, not on a control, once the toolbar is dismissed', async ({ page, voiceOver }) => {
  await mountEditor(page, voiceOver);
  await selectParagraphText(page);

  const inlineToolbar = page.getByRole('toolbar', { name: 'Text formatting' });

  await expect(inlineToolbar).toBeVisible();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Bold' })).toBeFocused();

  // Collapses the selection, which dismisses the toolbar.
  await page.getByRole('textbox', { name: 'Paragraph' }).click();
  await expect(inlineToolbar).toBeHidden();

  await resetCursor(voiceOver);

  // `sweep`, not `walk`: the reset leaves the cursor *on* the block, which `walk` would step
  // past without ever recording - and where the cursor lands is the whole subject here.
  const reachable = await sweep(voiceOver, SCAN_STEPS);

  // Guards against a vacuous pass: the sweep has to have actually covered the editor.
  expect(reachable.some(item => item.includes('hello world'))).toBe(true);

  // What this case can assert is that the user is put back in their document: dismissing the
  // toolbar leaves the cursor on the block's own content, not stranded on a control that no
  // longer does anything.
  expect(reachable[0]).toContain('hello world');
  expect(reachable[0]).not.toMatch(INLINE_TOOL_NAME);

  // What it deliberately does *not* assert - established by this case failing, not assumed - is
  // that the tools become unreachable. They do not: a sweep of the editor after dismissal still
  // reaches an item whose entire text is "bold".
  //
  // That is VoiceOver retaining nodes the document has already dropped, not a leak in the editor.
  // `InlineToolbarUI#hide` destroys the popover, which detaches it, and the DOM is provably clean
  // afterwards on both engines - `aria.spec.ts` ("takes its tools out of the accessibility tree
  // when dismissed") asserts exactly that, headlessly, and passes. `resetCursor` does not clear
  // the retained nodes either, so there is no navigation that makes the absence observable from
  // here; the editor has done everything it can and the residue is VoiceOver's.
  //
  // Not asserted in the inverted form Cases 3 and 15 use to pin their findings, because this one
  // is a cache artifact rather than a deterministic announcement: whether a given sweep length
  // reaches a retained node is not stable enough to fail a build over. Case 17 is where it
  // actually bites, and it handles it by bounding the scan with interact() instead.
});

test('Case 12: announces each block as a separate text field while walking the document', async ({ page, voiceOver }) => {
  await mountEditor(page, voiceOver, '?text=Alpha&text=Beta&text=Gamma');

  // The whole point of moving role="textbox" onto each block (and off the holder, see Case 1)
  // is that a user can move between blocks. With one block that's untestable - "no second text
  // field" is vacuously true - so this is the case that actually exercises it.
  const firstBlock = await describeCurrentItem(voiceOver);

  expect(firstBlock).toContain('alpha');
  expect(firstBlock).toMatch(TEXTBOX_ROLE);

  const itemsAhead = await walk(voiceOver, MULTI_BLOCK_WALK_STEPS);

  const beta = itemsAhead.findIndex(item => item.includes('beta'));
  const gamma = itemsAhead.findIndex(item => item.includes('gamma'));

  expect(beta).toBeGreaterThanOrEqual(0);
  expect(gamma).toBeGreaterThan(beta);

  // Each one announced as an editable field in its own right, not as inert text inside
  // some larger region.
  expect(itemsAhead[beta]).toMatch(TEXTBOX_ROLE);
  expect(itemsAhead[gamma]).toMatch(TEXTBOX_ROLE);
});

test('Case 13: announces what belongs in an empty block', async ({ page, voiceOver }) => {
  await mountEditor(page, voiceOver, '?text=');

  // A contenteditable has no native placeholder, so without aria-placeholder an empty block
  // is announced as an unlabelled empty field and there is nothing telling the user what to
  // type or that the editor is even ready for input.
  await findItem(voiceOver, new RegExp(PLACEHOLDER, 'i'));

  const description = await describeCurrentItem(voiceOver);

  expect(description).toContain('paragraph');
  expect(description).toMatch(TEXTBOX_ROLE);
});

test('Case 14: exposes a block created with Enter as a text field of its own', async ({ page, voiceOver }) => {
  await mountEditor(page, voiceOver);

  const paragraph = page.getByRole('textbox', { name: 'Paragraph' });

  await paragraph.click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');

  await expect(page.getByRole('textbox', { name: 'Paragraph' })).toHaveCount(2);

  // Known gap, deliberately not asserted: nothing announces the new block at the moment it is
  // created - there is no live region for it, and VoiceOver's cursor doesn't follow the caret -
  // so a user only learns about it by exploring. What must hold is that exploring finds it.
  const itemsAhead = await walk(voiceOver, FORWARD_WALK_STEPS);

  // The new block is empty, so what identifies it as *the block that was just created* is the
  // placeholder the paragraph tool exposes - not merely "a text field that isn't the first
  // one", which the link tool's URL input or any other editable on the page would satisfy too.
  const newBlock = itemsAhead.find(item => item.includes(PLACEHOLDER.toLowerCase()));

  expect(newBlock).toBeDefined();
  expect(newBlock).toMatch(TEXTBOX_ROLE);
});

test('Case 15: takes the user into the toolbox menu when the plus button is activated', async ({ page, voiceOver }) => {
  await mountEditor(page, voiceOver);

  await findItem(voiceOver, /add block/i);

  const collapsed = (await voiceOver.itemText()).toLowerCase();

  await voiceOver.act();

  await expect(page.getByRole('menu', { name: 'Add block' })).toBeVisible();

  // VoiceOver reads this button as "Add block menu pop-up button" whether the menu is open or
  // closed - the `aria-expanded` state never reaches speech. That's `aria-haspopup` suppressing
  // it, established by experiment rather than assumed: on a scratch page varying one attribute at
  // a time, VoiceOver announced the state fine on a plain button and dropped it as soon as
  // `aria-haspopup` was present, with `aria-controls` making no difference. A VoiceOver
  // limitation, not a gap in our markup - so the round trip isn't assertable from here and
  // aria.spec.ts covers it at the DOM level instead. Full results in voiceover-verification.md.
  //
  // What VoiceOver does instead is take the user to the menu: activating the button moves DOM
  // focus into the popover's search field, and a focus change caused by VoiceOver's own command
  // is one it follows. Arriving there is how a VoiceOver user learns the menu opened, so that
  // is what this case asserts.
  const afterActivating = await describeCurrentItem(voiceOver);

  expect(afterActivating).toContain('search');
  expect(afterActivating).toMatch(TEXTBOX_ROLE);

  // The button is behind the cursor now, and has to stay reachable and named while the menu is
  // open - a control that goes silent or unnamed once its popup is showing leaves the user no
  // way back to it. Walked rather than read at one stop: how many stops back it is, and whether
  // the popover announces a container of its own on the way, isn't worth hardcoding.
  const itemsBehind = await walk(voiceOver, BACKWARD_WALK_STEPS, 'previous');
  const plusButtonHeard = itemsBehind.filter(item => item.includes('add block'));

  expect(plusButtonHeard.length).toBeGreaterThan(0);
  expect(plusButtonHeard[0]).toContain('button');

  // Pins the finding rather than assuming it holds forever: if a future VoiceOver or ui-kit
  // version does start exposing the state, the open announcement stops matching the closed one
  // and this fails - prompting the case to be tightened into a real round-trip assertion.
  //
  // Compared on the item description alone, not the fuller `describeCurrentItem` string: half of
  // that is the last *spoken* phrase, which can still be describing the previous stop, so an
  // exact match on it would fail on timing rather than on the state having changed.
  expect(plusButtonHeard[0]).toBe(collapsed);
});

test('Case 16: returns the user to the plus button when the toolbox is dismissed', async ({ page, voiceOver }) => {
  await mountEditor(page, voiceOver);

  await findItem(voiceOver, /add block/i);
  await voiceOver.act();

  const menu = page.getByRole('menu', { name: 'Add block' });

  await expect(menu).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(menu).toBeHidden();

  // Safari doesn't focus a button when it's clicked, so the popover used to capture <body> as
  // the element to restore focus to and dismissing the menu dropped the user out of the editor
  // entirely. ToolbarUI focuses the button explicitly now; this is the announcement half of the
  // aria.spec.ts test that asserts the focus move itself.
  const plusButton = page.getByRole('button', { name: 'Add block' });

  await expect(plusButton).toBeFocused();
  await syncCursorToFocus(voiceOver);

  const description = await describeCurrentItem(voiceOver);

  expect(description).toContain('add block');
  expect(description).toContain('button');
});

test('Case 17: announces applied links as links', async ({ page, voiceOver }) => {
  await mountEditor(page, voiceOver);
  await selectParagraphText(page);

  const inlineToolbar = page.getByRole('toolbar', { name: 'Text formatting' });

  await expect(inlineToolbar).toBeVisible();

  await tabToInlineTool(page, page.getByRole('button', { name: 'Link' }));

  await page.keyboard.press('Enter');
  await page.keyboard.type('https://example.com');
  await page.keyboard.press('Enter');

  await expect(page.getByRole('textbox', { name: 'Paragraph' }).getByRole('link')).toHaveCount(1);

  // Collapsing the selection dismisses the toolbar, which is what a user does next anyway. It is
  // not what makes the reading below safe, though - see the second finding under the scan.
  await page.getByRole('textbox', { name: 'Paragraph' }).click();
  await expect(inlineToolbar).toBeHidden();

  // Navigate to the block deliberately, then read *inside* it.
  //
  // Two findings shape this, both established by experiment rather than guessed at (results in
  // voiceover-verification.md under this case). First, VoiceOver does not announce a link nested
  // in editable content at the browse cursor - it reads the field's value flat. That is
  // `contenteditable`, not the `role="textbox"` this change added: a plain contenteditable
  // behaves identically, and a non-editable container announces the link fine. So reading the
  // block from outside can never satisfy this case. Interacting with the field (VO-Shift-Down)
  // is the other way VoiceOver reads editable text, and is the path a user takes to move through
  // it - so that is the path asserted here.
  //
  // Second, the scan has to stay *inside* the block. An earlier version walked across it and
  // passed twice in three runs for the wrong reason: the inline toolbar's controls stay reachable
  // to VoiceOver after dismissal - it retains nodes the document has already dropped, and no
  // amount of re-navigating clears them (Case 11 records the evidence) - and their item text is
  // the bare tool name, so Link announces as "link". A walk long enough to leave the block
  // matched the control that *applies* the formatting rather than the formatted text, and would
  // pass with the text completely unchanged. Interacting bounds the scan to the block, which is
  // the only reliable fix: the toolbar being gone from the DOM is not enough.
  await resetCursor(voiceOver);
  await voiceOver.clearSpokenPhraseLog();
  await findItem(voiceOver, /hello world/i);

  await voiceOver.interact();

  // Applying a tool has to change what the text sounds like, not just what it looks like -
  // otherwise a screen-reader user has no way to tell the link is there.
  const insideBlock = [
    await describeCurrentItem(voiceOver),
    ...await describeWalk(voiceOver, INSIDE_BLOCK_STEPS),
  ];

  await voiceOver.stopInteracting();

  // Guards against a vacuous pass: interacting must have produced announcements for their
  // content to mean anything.
  expect(insideBlock.join('').trim().length).toBeGreaterThan(0);
  expect(insideBlock.join(' | ')).toContain('link');
});

/**
 * Every distinct item matching `pattern` that VoiceOver's cursor reaches within `SCAN_STEPS`
 * forward steps.
 *
 * Returns the matches rather than a boolean so that asserting "nothing is reachable" fails with
 * the offending announcements in the message. A bare `toBe(false)` says only that something
 * matched, which leaves you guessing at whether the fault is the page or the pattern.
 * @param voiceOver - Guidepup VoiceOver controller
 * @param pattern - matched against the current item's text at each stop
 */
async function collectReachable(voiceOver: VoiceOverPlaywright, pattern: RegExp): Promise<string[]> {
  const reachable = await sweep(voiceOver, SCAN_STEPS);

  return [...new Set(reachable.filter(item => pattern.test(item)))];
}

test('Case 18: does not let the cursor reach toolbox items filtered out by search', async ({ page, voiceOver }) => {
  await mountEditor(page, voiceOver);

  await findItem(voiceOver, /add block/i);
  await voiceOver.act();

  const menu = page.getByRole('menu', { name: 'Add block' });

  await expect(menu).toBeVisible();

  const menuItemPattern = /menu item/;

  // Baseline. It also guards the real assertion below: if VoiceOver words menu items
  // differently than this expects, the test fails here instead of making "nothing reachable"
  // pass for the wrong reason.
  await resetCursor(voiceOver);

  const beforeFiltering = await collectReachable(voiceOver, menuItemPattern);

  expect(beforeFiltering.length).toBeGreaterThan(0);

  // Opening the toolbox puts DOM focus in its search field; filling it filters the list.
  await page.getByRole('searchbox', { name: 'Search' }).fill('no such tool');

  await expect(menu.getByRole('menuitem')).toHaveCount(0);

  // Back to the top rather than continuing from wherever the scan stopped - that item may be
  // one of the ones just hidden, and VoiceOver would keep describing it from where it stands.
  // The round trip inside resetCursor is what makes this reliable: `fill()` is a page-driven
  // change, so without it VoiceOver can still be describing the unfiltered list.
  await resetCursor(voiceOver);

  // Filtered items are `display: none` (ui-kit's `--hidden` class, which wins over the item's
  // own `display: flex`), so nothing matching should remain reachable. If something does, the
  // message below carries its announcement - the answer to "is this the hidden item, or is the
  // pattern matching something else entirely" is not worth guessing at.
  expect(await collectReachable(voiceOver, menuItemPattern)).toEqual([]);
});
