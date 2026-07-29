import { test, expect } from '@playwright/test';
import { PLACEHOLDER, mountDocument, selectParagraphText, tabToInlineTool } from '../support/editor.js';

test.beforeEach(async ({ page }) => {
  await mountDocument(page);
});

/** Test-only channel for the arrow keys the block actions toolbar called preventDefault() on. */
interface ArrowKeyWindow extends Window {
  /** Keys seen already prevented by the time the event reached document, in order. */
  swallowedArrowKeys?: string[];
}

test('exposes the blocks holder as a structural group', async ({ page }) => {
  const holder = page.getByRole('group');

  await expect(holder).toBeVisible();
  await expect(holder).toHaveClass(/ejs-blocks/);
});

test('exposes a paragraph block as a multiline textbox', async ({ page }) => {
  const paragraph = page.getByRole('textbox', { name: 'Paragraph' });

  await expect(paragraph).toBeVisible();
  await expect(paragraph).toHaveAttribute('aria-multiline', 'true');
  await expect(paragraph).toHaveText('Hello world');
});

test('exposes every block as a textbox of its own, in document order', async ({ page }) => {
  const texts = ['Alpha', 'Beta', 'Gamma'];

  await mountDocument(page, `?${texts.map(text => `text=${text}`).join('&')}`);

  const blocks = page.getByRole('group').getByRole('textbox', { name: 'Paragraph' });

  // One textbox per block, none nested and none merged: this is what lets assistive tech
  // move between blocks at all, and it's the reason the holder had to stop being a textbox.
  await expect(blocks).toHaveCount(texts.length);
  await expect(blocks).toHaveText(texts);

  const count = await blocks.count();

  for (let index = 0; index < count; index++) {
    await expect(blocks.nth(index)).toHaveAttribute('aria-multiline', 'true');
  }
});

test('describes the expected input of an empty block with aria-placeholder', async ({ page }) => {
  await mountDocument(page, '?text=');

  const paragraph = page.getByRole('textbox', { name: 'Paragraph' });

  // A contenteditable has no native placeholder attribute, so without this an empty block
  // announces as an empty field with no indication of what belongs in it.
  await expect(paragraph).toHaveText('');
  await expect(paragraph).toHaveAttribute('aria-placeholder', PLACEHOLDER);
});

test('omits aria-placeholder entirely when none is configured', async ({ page }) => {
  await mountDocument(page, '?text=&placeholder=');

  const paragraph = page.getByRole('textbox', { name: 'Paragraph' });

  await expect(paragraph).toHaveText('');

  // The attribute has to be absent rather than empty: `aria-placeholder=""` is still an
  // exposed property, and the positive test above passes either way, so nothing else pins
  // that the tool skips the attribute instead of writing a blank one.
  await expect(paragraph).not.toHaveAttribute('aria-placeholder');
});

test('splits into a second, separately exposed textbox on Enter', async ({ page }) => {
  const paragraph = page.getByRole('textbox', { name: 'Paragraph' });

  await paragraph.click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');

  const blocks = page.getByRole('textbox', { name: 'Paragraph' });

  await expect(blocks).toHaveCount(2);
  await expect(blocks).toHaveText(['Hello world', '']);
  await expect(blocks.nth(1)).toHaveAttribute('aria-placeholder', PLACEHOLDER);
});

test('does not nest a textbox inside a textbox', async ({ page }) => {
  // The blocks holder is itself contenteditable, which HTML-AAM maps to an
  // implicit role="textbox". The explicit role="group" overrides that, so the
  // block is the only textbox exposed rather than one nested inside another.
  await expect(page.getByRole('group').getByRole('textbox')).toHaveCount(1);
});

test('exposes the floating toolbar and names its plus button', async ({ page }) => {
  // Named, because the inline toolbar is a `role="toolbar"` too once a selection exists.
  const toolbar = page.getByRole('toolbar', { name: 'Block actions' });

  await expect(toolbar).toBeVisible();

  // The plus button is icon-only, so its name comes entirely from aria-label.
  await expect(toolbar.getByRole('button', { name: 'Add block' })).toBeVisible();
});

test('exposes the block actions toolbar as a single tab stop', async ({ page }) => {
  const toolbar = page.getByRole('toolbar', { name: 'Block actions' });

  await expect(toolbar).toHaveAttribute('aria-orientation', 'horizontal');

  // role="toolbar" is a promise that the group is one tab stop navigated with the arrow keys.
  // Asserted structurally rather than behaviourally because there is exactly one control today,
  // which makes an arrow-key assertion pass whether or not anything handles the key. This
  // assertion does not: it fails the moment a second control is added to the container without
  // the roving tabindex being maintained, which is the regression actually worth catching.
  expect(await toolbar.locator(':scope > button').count()).toBeGreaterThan(0);
  expect(await toolbar.locator(':scope > button[tabindex="0"]').count()).toBe(1);
});

test('leaves modified arrow keys to their real owner', async ({ page }) => {
  // Regression test for a bug the VoiceOver suite found the hard way. The roving tabindex above
  // handles ArrowLeft/ArrowRight and calls preventDefault(), and it used to do so whatever
  // modifiers were held - but VO+Right and VO+Left, the commands a VoiceOver user moves their
  // cursor with, reach the page as Control+Option+Arrow. So once the VoiceOver cursor reached
  // the plus button (Safari focuses a control when the cursor lands on it), the toolbar ate
  // every attempt to move off it and the user was trapped there.
  //
  // Asserted through defaultPrevented rather than through where focus ends up: with one control
  // in the toolbar the handler's focus move is a no-op on itself, so focus looks correct in both
  // the fixed and the broken version. Swallowing the key is the whole defect.
  // Recorded on document, which sees the event after the toolbar's own listener has run.
  await page.evaluate(() => {
    const swallowed: string[] = [];

    (window as ArrowKeyWindow).swallowedArrowKeys = swallowed;

    document.addEventListener('keydown', (event) => {
      if (event.defaultPrevented) {
        swallowed.push(event.key);
      }
    });
  });

  await page.getByRole('button', { name: 'Add block' }).focus();

  // Plain arrows are the toolbar's own, per the WAI-ARIA toolbar pattern. Everything modified
  // belongs to someone else: the screen reader, the OS, or text selection.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Control+Alt+ArrowRight');
  await page.keyboard.press('Control+Alt+ArrowLeft');
  await page.keyboard.press('Meta+ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');

  const swallowed = await page.evaluate(() => (window as ArrowKeyWindow).swallowedArrowKeys ?? []);

  // Exactly one entry, from the unmodified press. Asserted as the whole list rather than as four
  // separate negatives, so a handler that stops swallowing the plain arrow too - which would make
  // every negative pass - fails here instead of quietly disabling the pattern.
  expect(swallowed).toEqual(['ArrowRight']);
});

test.describe('toolbox', () => {
  test('the plus button advertises the menu it controls', async ({ page }) => {
    const plusButton = page.getByRole('button', { name: 'Add block' });

    await expect(plusButton).toHaveAttribute('aria-haspopup', 'menu');
    await expect(plusButton).toHaveAttribute('aria-expanded', 'false');

    await plusButton.click();

    await expect(plusButton).toHaveAttribute('aria-expanded', 'true');
  });

  test('opens a named menu listing the available block types', async ({ page }) => {
    await page.getByRole('button', { name: 'Add block' }).click();

    const menu = page.getByRole('menu', { name: 'Add block' });

    await expect(menu).toBeVisible();

    // 'Text' is the paragraph tool's toolbox title, which ui-kit turns into the
    // item's accessible name.
    await expect(menu.getByRole('menuitem', { name: 'Text' })).toBeVisible();
  });

  test('names the toolbox search field', async ({ page }) => {
    await page.getByRole('button', { name: 'Add block' }).click();

    await expect(page.getByRole('searchbox', { name: 'Search' })).toBeVisible();
  });

  test('moves focus onto a menu item with the arrow keys', async ({ page }) => {
    await page.getByRole('button', { name: 'Add block' }).click();

    await page.keyboard.press('ArrowDown');

    // The desktop popover moves real DOM focus, so assistive tech follows along
    // instead of only seeing a CSS class change.
    await expect(page.getByRole('menuitem', { name: 'Text' })).toBeFocused();
  });

  test('inserts a block when a menu item is activated by keyboard', async ({ page }) => {
    await page.getByRole('button', { name: 'Add block' }).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('textbox', { name: 'Paragraph' })).toHaveCount(2);
  });

  test('hides filtered-out items from the accessibility tree while searching', async ({ page }) => {
    await page.getByRole('button', { name: 'Add block' }).click();

    const menu = page.getByRole('menu', { name: 'Add block' });

    await expect(menu.getByRole('menuitem', { name: 'Text' })).toBeVisible();

    await page.getByRole('searchbox', { name: 'Search' }).fill('no such tool');

    // Filtering hides items with a CSS class; the `hidden` attribute alongside it is what
    // takes them out of the accessibility tree, so a screen reader can't land on a result
    // the sighted user can no longer see.
    await expect(menu.getByRole('menuitem')).toHaveCount(0);

    await page.getByRole('searchbox', { name: 'Search' }).fill('Te');

    await expect(menu.getByRole('menuitem', { name: 'Text' })).toBeVisible();
  });

  test('returns focus to the plus button when dismissed with Escape', async ({ page }) => {
    const plusButton = page.getByRole('button', { name: 'Add block' });

    await plusButton.click();
    await expect(page.getByRole('menu', { name: 'Add block' })).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.getByRole('menu', { name: 'Add block' })).toBeHidden();

    // Focus must come back to the control that opened the menu, per the WAI-ARIA menu button
    // pattern. Safari doesn't focus a button on click, so without ToolbarUI focusing it
    // explicitly the popover restores focus to <body> and a keyboard user loses their place.
    await expect(plusButton).toBeFocused();
    await expect(plusButton).toHaveAttribute('aria-expanded', 'false');
  });

  test('does not drop focus out of the editor after inserting a block', async ({ page }) => {
    await page.getByRole('button', { name: 'Add block' }).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('textbox', { name: 'Paragraph' })).toHaveCount(2);

    // Deliberately does not pin *which* element holds focus: where it should land is the
    // subject of the test below, which currently fails. This asserts only the invariant that
    // holds either way — focus is on something real, not on the document body.
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? 'NONE');

    expect(['BODY', 'HTML', 'NONE']).not.toContain(focusedTag);
  });

  test('puts the caret in the block it just inserted', async ({ page }) => {
    // Expected to fail: `ToolboxUI#addTool` passes `focus: true` to `blocks.insert`, but the
    // caret does not follow, so focus falls back to the menu button the popover restores it to.
    // Written as the behavior that *should* hold rather than the one that does — a passing
    // assertion on the current behavior would turn fixing the todo into a test regression.
    // Playwright fails the run if this ever starts passing, which is the signal to remove
    // `test.fail()` and the todo together.
    test.fail();

    await page.getByRole('button', { name: 'Add block' }).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    const blocks = page.getByRole('textbox', { name: 'Paragraph' });

    await expect(blocks).toHaveCount(2);
    await expect(blocks.nth(1)).toBeFocused();
  });
});

test.describe('inline toolbar', () => {
  test('exposes the inline tools as a named toolbar of buttons', async ({ page }) => {
    await selectParagraphText(page);

    const inlineToolbar = page.getByRole('toolbar', { name: 'Text formatting' });

    await expect(inlineToolbar).toBeVisible();
    await expect(inlineToolbar.getByRole('button', { name: 'Bold' })).toBeVisible();
    await expect(inlineToolbar.getByRole('button', { name: 'Italic' })).toBeVisible();
  });

  test('reports the applied formatting through aria-pressed', async ({ page }) => {
    await selectParagraphText(page);

    const boldButton = page.getByRole('button', { name: 'Bold' });

    await expect(boldButton).toHaveAttribute('aria-pressed', 'false');

    await boldButton.click();

    // The popover is rebuilt on every selection change, so re-selecting the now-bold
    // text is what produces the updated state.
    await selectParagraphText(page);

    await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('mirrors the highlighted tool onto aria-activedescendant of the focused editable', async ({ page }) => {
    await selectParagraphText(page);

    const boldButton = page.getByRole('button', { name: 'Bold' });

    // Wait for the toolbar before navigating it: until the popover is rendered its keyboard
    // handler is not listening yet, and ArrowDown would just collapse the selection.
    await expect(boldButton).toBeVisible();

    // The blocks holder is the outermost contenteditable, so the browser keeps focus there
    // rather than on the individual block. aria-activedescendant is only honoured on the
    // element that actually holds focus, which is what the toolbar points at.
    const focusedEditable = page.getByRole('group');

    await expect(focusedEditable).toBeFocused();

    // The inline toolbar deliberately never takes focus itself — moving it to a button drops
    // the text selection the tools operate on — so this is the only way the highlighted
    // button reaches assistive tech.
    await expect(focusedEditable).not.toHaveAttribute('aria-activedescendant');

    await page.keyboard.press('ArrowDown');

    const boldId = await boldButton.getAttribute('id');

    expect(boldId).not.toBeNull();
    await expect(focusedEditable).toHaveAttribute('aria-activedescendant', boldId as string);
  });

  test('claims the popover via aria-owns so the activedescendant resolves', async ({ page }) => {
    await selectParagraphText(page);

    const boldButton = page.getByRole('button', { name: 'Bold' });

    await expect(boldButton).toBeVisible();
    await page.keyboard.press('ArrowDown');

    // aria-activedescendant is only honoured when it names an element inside the focused
    // element's subtree, or one claimed by it via aria-owns. The inline toolbar is rendered as
    // a *sibling* of the blocks holder, so the attribute matching the button's id proves
    // nothing on its own — asserted here over the resolved relationship instead, which is what
    // actually decides whether assistive tech follows the reference or silently drops it.
    const resolution = await page.evaluate(() => {
      const focused = document.activeElement as HTMLElement | null;
      const itemId = focused?.getAttribute('aria-activedescendant') ?? null;
      const ownsId = focused?.getAttribute('aria-owns') ?? null;
      const item = itemId !== null ? document.getElementById(itemId) : null;
      const owned = ownsId !== null ? document.getElementById(ownsId) : null;

      return {
        itemFound: item !== null,
        ownedFound: owned !== null,
        // The DOM stays untouched — this is an accessibility-tree relationship only.
        itemIsDomDescendantOfFocused: item !== null && focused !== null && focused.contains(item),
        itemIsInsideOwned: item !== null && owned !== null && owned.contains(item),
      };
    });

    expect(resolution).toEqual({
      itemFound: true,
      ownedFound: true,
      itemIsDomDescendantOfFocused: false,
      itemIsInsideOwned: true,
    });
  });

  test('gives each editor on a page its own inline toolbar', async ({ page, browserName }) => {
    // Passes on webkit, fails on chromium, on a pre-existing bug that has nothing to do with
    // ARIA: there, the inline toolbar is not scoped to its editor instance. Two editors mount
    // two toolbars, but selecting text in the second one raises the *first* one's — positioned
    // over the first editor, operating on the first editor's selection. Located directly to be
    // sure of it: the popover that appears sits inside editor 0's wrapper whichever editor was
    // clicked. Webkit raises the right one, so this is engine behaviour the selection pipeline
    // depends on rather than a flat missing feature.
    //
    // Pinned per engine rather than skipped, so that fixing chromium trips the test instead of
    // leaving it quietly asserting the bug, and so a webkit regression is caught meanwhile.
    //
    // What chromium fails on is the *first* assertion below, not the scoping one: because the
    // raised toolbar belongs to another editor, `InlineToolbarUI` declines to claim its popover
    // from this editor's holder at all (see #activeDescendantTarget), so `aria-owns` is absent
    // rather than pointing at the wrong editor. That is deliberate — a missing claim is safer
    // for a screen reader than a confident wrong one — but it means the symptom here is a null
    // id, which on its own reads like the reference is broken rather than the toolbar misrouted.
    test.fail(browserName === 'chromium', 'inline toolbar is not scoped per editor on chromium');

    await mountDocument(page, '?editors=2');

    // What only a multi-editor page can cover: `aria-owns` resolves by document-wide id lookup,
    // so each toolbar's popover id has to be per instance. A single fixed id would point the
    // second editor's blocks holder at the first editor's controls.
    const claims: string[] = [];

    for (const index of [0, 1]) {
      await page.getByRole('textbox', { name: 'Paragraph' })
        .nth(index)
        .click({ clickCount: 3 });
      await expect(page.getByRole('button', { name: 'Bold' })).toBeVisible();
      await page.keyboard.press('ArrowDown');

      const owned = await page.evaluate(() => {
        const focused = document.activeElement as HTMLElement | null;
        const ownsId = focused?.getAttribute('aria-owns') ?? null;
        const target = ownsId !== null ? document.getElementById(ownsId) : null;

        return {
          ownsId,
          /** The claimed popover has to belong to the editor whose text is being formatted */
          isInSameEditor: target !== null && focused?.closest('.ejs-editor')?.contains(target) === true,
        };
      });

      expect(owned.ownsId).not.toBeNull();
      expect(owned.isInSameEditor).toBe(true);

      claims.push(owned.ownsId as string);
    }

    expect(claims[0]).not.toBe(claims[1]);
  });

  test('releases the popover it claimed once the toolbar is dismissed', async ({ page }) => {
    await selectParagraphText(page);

    await expect(page.getByRole('button', { name: 'Bold' })).toBeVisible();
    await page.keyboard.press('ArrowDown');

    const focusedEditable = page.getByRole('group');

    await expect(focusedEditable).toHaveAttribute('aria-owns', /.+/);

    // A stale aria-owns would keep a destroyed popover claimed by the editable, leaving the
    // accessibility tree pointing at a subtree the document no longer has.
    await page.getByRole('textbox', { name: 'Paragraph' }).click();

    await expect(focusedEditable).not.toHaveAttribute('aria-owns');
    await expect(focusedEditable).not.toHaveAttribute('aria-activedescendant');
  });

  test('is reachable from the text by Tab', async ({ page }) => {
    await selectParagraphText(page);

    const boldButton = page.getByRole('button', { name: 'Bold' });

    await expect(boldButton).toBeVisible();

    await page.keyboard.press('Tab');

    await expect(boldButton).toBeFocused();
  });

  test('exposes applied links as links in the text', async ({ page }) => {
    await selectParagraphText(page);

    const linkButton = page.getByRole('button', { name: 'Link' });

    await expect(linkButton).toBeVisible();

    await tabToInlineTool(page, linkButton);

    await page.keyboard.press('Enter');
    await page.keyboard.type('https://example.com');
    await page.keyboard.press('Enter');

    // The applied formatting has to reach the accessibility tree as a real link, otherwise a
    // screen reader reads the text with no indication that part of it is navigable.
    const link = page.getByRole('textbox', { name: 'Paragraph' }).getByRole('link');

    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', 'https://example.com');
    await expect(link).toHaveText('Hello world');
  });

  test('announces its own appearance once via a live region', async ({ page }) => {
    await selectParagraphText(page);

    // ui-kit's own popover also carries a role="status" region (search/confirmation
    // announcements), so this targets the toolbar's own by its test id, not by role alone.
    const status = page.getByTestId('inline-toolbar-announcer');

    await expect(status).toHaveText('Text formatting toolbar available. Press Tab to enter.');

    // Shrinking the selection by one character keeps it non-empty throughout, so the toolbar
    // stays continuously open and its popover is rebuilt (see the "reports the applied
    // formatting" test above) without ever passing through a hidden state. It must not
    // re-announce here - otherwise every character of a dragged selection would retrigger it.
    await status.evaluate((el) => {
      el.textContent = 'sentinel';
    });

    await page.keyboard.press('Shift+ArrowLeft');

    await expect(page.getByRole('button', { name: 'Bold' })).toBeVisible();
    await expect(status).toHaveText('sentinel');
  });

  test('announces again when the toolbar is genuinely reopened', async ({ page }) => {
    const message = 'Text formatting toolbar available. Press Tab to enter.';
    const status = page.getByTestId('inline-toolbar-announcer');

    await selectParagraphText(page);

    await expect(status).toHaveText(message);

    // The other half of "once per open". `InlineToolbarUI#show` only announces on a genuine
    // hidden-to-shown transition, so a regression that left its visibility state stuck would
    // make the toolbar silent for the rest of the session - and the no-repeat test above would
    // still pass, since it only ever proves the announcement *doesn't* fire.
    await page.getByRole('textbox', { name: 'Paragraph' }).click();

    await expect(page.getByRole('toolbar', { name: 'Text formatting' })).toBeHidden();

    await status.evaluate((el) => {
      el.textContent = 'sentinel';
    });

    await selectParagraphText(page);

    await expect(page.getByRole('toolbar', { name: 'Text formatting' })).toBeVisible();
    await expect(status).toHaveText(message);
  });

  test('takes its tools out of the accessibility tree when dismissed', async ({ page }) => {
    await selectParagraphText(page);

    const boldButton = page.getByRole('button', { name: 'Bold' });

    await expect(boldButton).toBeVisible();

    // Collapses the selection, which dismisses the toolbar.
    await page.getByRole('textbox', { name: 'Paragraph' }).click();

    await expect(page.getByRole('toolbar', { name: 'Text formatting' })).toBeHidden();

    // Hidden isn't enough on its own: a control that is merely invisible can still be reachable
    // by a virtual cursor, which would leave a screen reader able to land on tools that are no
    // longer there. `#hide()` destroys the popover, which detaches it - this pins that, because
    // switching to a plain `hide()` would look identical to a visibility assertion.
    await expect(boldButton).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Italic' })).toHaveCount(0);
  });
});
