import { test, expect } from '@playwright/test';
import { mountDocument } from '../support/editor.js';

/** The three entries the default block settings plugin contributes. */
const DEFAULT_ITEM_COUNT = 3;

/** Slack, in pixels, when checking the toolbar has lined up with a block. */
const ALIGNMENT_TOLERANCE = 4;

/**
 * The toolbar follows whichever block the pointer is over, so a test opens settings for a
 * particular block by hovering it first and then clicking the toolbar's settings button.
 */

test.beforeEach(async ({ page }) => {
  await mountDocument(page, '?text=Alpha&text=Beta');
});

test.describe('opening the menu', () => {
  test('opens the settings menu for the hovered block', async ({ page }) => {
    const blocks = page.getByRole('textbox', { name: 'Paragraph' });

    await blocks.nth(1).hover();
    await page.getByRole('button', { name: 'Block settings' }).click();

    // Named from the message catalogue, the same way the toolbox menu is.
    const menu = page.getByRole('menu', { name: 'Block settings' });

    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Move up' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Move down' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  });

  test('reports the menu state on the button that owns it', async ({ page }) => {
    const settingsButton = page.getByRole('button', { name: 'Block settings' });

    await page.getByRole('textbox', { name: 'Paragraph' }).first()
      .hover();

    await expect(settingsButton).toHaveAttribute('aria-haspopup', 'menu');
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'false');

    await settingsButton.click();

    await expect(settingsButton).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');

    await expect(settingsButton).toHaveAttribute('aria-expanded', 'false');

    // The menu button pattern hands focus back to the button the menu was opened from.
    await expect(settingsButton).toBeFocused();
  });

  test('closes the menu when the button that opened it is clicked again', async ({ page }) => {
    const settingsButton = page.getByRole('button', { name: 'Block settings' });
    const menu = page.getByRole('menu', { name: 'Block settings' });

    await page.getByRole('textbox', { name: 'Paragraph' }).first()
      .hover();

    await settingsButton.click();
    await expect(menu).toBeVisible();

    // The popover closes itself on this click before the button's own handler runs, so what
    // this asserts is that the handler does not immediately re-open it -- which is what made
    // the button look inert on every second click.
    await settingsButton.click();

    await expect(menu).toBeHidden();
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'false');

    await settingsButton.click();

    await expect(menu).toBeVisible();
  });

  test('opens for the caret block without the pointer ever entering one', async ({ page }) => {
    const blocks = page.getByRole('textbox', { name: 'Paragraph' });
    const toolbar = page.getByRole('toolbar', { name: 'Block actions' });

    // Block selection is dispatched on pointer enter, so nothing here may hover a block: this
    // is the path a keyboard-only user takes, and the button used to open nothing at all.
    await page.keyboard.press('Tab');

    // Waited for rather than assumed: the arrow keys below are only caret moves once the
    // editor actually holds focus, and pressing them early leaves the document untouched.
    await expect(page.getByRole('group')).toBeFocused();

    // Tab reaches the editor but places no caret in a block; an arrow key is what does.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.type('!');

    // Typing is what says where the caret actually is, rather than assuming the arrows put it
    // there. The second block is the target, so the toolbar has somewhere visible to move to.
    await expect(blocks).toHaveText(['Alpha', '!Beta']);

    // The browser delivers `selectionchange` on its own schedule, so the caret reaching the
    // editor and the toolbar hearing about it are two different moments. Waiting for the
    // toolbar to line up with the second block waits for the second -- and is itself the other
    // half of what this fixes, the toolbar following a caret that no pointer led.
    await expect.poll(async () => {
      const toolbarBox = await toolbar.boundingBox();
      const blockBox = await blocks.nth(1).boundingBox();

      if (toolbarBox === null || blockBox === null) {
        return false;
      }

      return Math.abs(toolbarBox.y - blockBox.y) < ALIGNMENT_TOLERANCE;
    }).toBe(true);

    // `press` on the locator rather than `focus()` then `keyboard.press`: the two-step form
    // races, and an Enter that arrives before focus lands goes to the editor as a new block.
    await page.getByRole('button', { name: 'Block settings' }).press('Enter');

    const menu = page.getByRole('menu', { name: 'Block settings' });

    await expect(menu).toBeVisible();

    // The caret is in the last block, so moving further down is what must be unavailable --
    // which is also what says the menu was built for that block and not some default.
    await expect(menu.getByRole('menuitem', { name: 'Move down' })).toHaveAttribute('aria-disabled', 'true');
    await expect(menu.getByRole('menuitem', { name: 'Move up' })).not.toHaveAttribute('aria-disabled', 'true');
  });
});

test.describe('presentation', () => {
  test('highlights the whole row on hover, not just the label', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Paragraph' }).first()
      .hover();
    await page.getByRole('button', { name: 'Block settings' }).click();

    await expect(page.getByRole('menu', { name: 'Block settings' })).toBeVisible();

    // Regression test for the item wrapper: rendering menu items as `button` — right for
    // ui-kit's inline toolbar, wrong for a vertical menu — made each row shrink to its own
    // label, so the hover highlight covered a ragged part of it. Measured in one pass in the
    // page and after the webfont has settled, because one locator at a time reads the rows at
    // different moments and a loading font moves the menu's width between them.
    const widths = await page.evaluate(async () => {
      await document.fonts.ready;

      // Scoped by name: the toolbox renders a `role="menu"` of its own, closed but present.
      const menu = document.querySelector('[role="menu"][aria-label="Block settings"]');

      return [...(menu?.querySelectorAll('[role="menuitem"]') ?? [])]
        .map(item => item.getBoundingClientRect().width);
    });

    expect(widths).toHaveLength(DEFAULT_ITEM_COUNT);
    expect(widths[0]).toBeGreaterThan(0);

    // Every row is as wide as the menu rather than as wide as its own label. Broken, these came
    // out at roughly 90 / 108 / 76 px — one per label length.
    expect(new Set(widths).size).toBe(1);
  });

  test('disables moving further at the document boundaries', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Paragraph' }).first()
      .hover();
    await page.getByRole('button', { name: 'Block settings' }).click();

    const menu = page.getByRole('menu', { name: 'Block settings' });

    await expect(menu.getByRole('menuitem', { name: 'Move up' })).toBeDisabled();
    await expect(menu.getByRole('menuitem', { name: 'Move down' })).toBeEnabled();
  });

  test('marks an unavailable action as disabled rather than hiding it', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Paragraph' }).first()
      .hover();
    await page.getByRole('button', { name: 'Block settings' }).click();

    // Exposed through aria-disabled, and still reachable by the arrow keys: the APG keeps
    // disabled menu items focusable so they can be discovered rather than silently missing.
    const moveUp = page.getByRole('menu', { name: 'Block settings' }).getByRole('menuitem', { name: 'Move up' });

    await expect(moveUp).toHaveAttribute('aria-disabled', 'true');
  });
});

test.describe('keyboard operation', () => {
  test('is operable from the keyboard alone', async ({ page }) => {
    const blocks = page.getByRole('textbox', { name: 'Paragraph' });

    await blocks.first().hover();
    await page.getByRole('button', { name: 'Block settings' }).click();

    const menu = page.getByRole('menu', { name: 'Block settings' });

    await expect(menu).toBeVisible();

    // The items are divs with role="menuitem", as the ARIA menu pattern calls for -- so nothing
    // here is inherited from a native control. Arrow-key navigation, the roving tabindex and
    // Enter activation are all ui-kit's, and this is what says they still hold for this menu.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');

    await expect(menu.getByRole('menuitem', { name: 'Move down' })).toBeFocused();

    await page.keyboard.press('Enter');

    await expect(blocks).toHaveText(['Beta', 'Alpha']);
    await expect(menu).toBeHidden();
  });
});

test.describe('actions', () => {
  test('moves a block up from the settings menu', async ({ page }) => {
    const blocks = page.getByRole('textbox', { name: 'Paragraph' });

    await expect(blocks).toHaveText(['Alpha', 'Beta']);

    await blocks.nth(1).hover();
    await page.getByRole('button', { name: 'Block settings' }).click();
    await page.getByRole('menuitem', { name: 'Move up' }).click();

    await expect(blocks).toHaveText(['Beta', 'Alpha']);
  });

  test('deletes a block only after its confirmation is activated', async ({ page }) => {
    const blocks = page.getByRole('textbox', { name: 'Paragraph' });

    await blocks.nth(1).hover();
    await page.getByRole('button', { name: 'Block settings' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    // The item becomes its own confirmation in place: same element, new title, new action.
    await expect(blocks).toHaveText(['Alpha', 'Beta']);

    await page.getByRole('menuitem', { name: 'Click to delete' }).click();

    await expect(blocks).toHaveText(['Alpha']);
  });

  test('abandons a pending deletion when the menu is dismissed', async ({ page }) => {
    const blocks = page.getByRole('textbox', { name: 'Paragraph' });

    await blocks.nth(1).hover();
    await page.getByRole('button', { name: 'Block settings' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.keyboard.press('Escape');

    await expect(blocks).toHaveText(['Alpha', 'Beta']);
  });
});
