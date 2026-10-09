import { test, expect } from '@playwright/test';
import { mountDocument } from '../support/editor.js';

/** The three entries the default block settings plugin contributes. */
const DEFAULT_ITEM_COUNT = 3;

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
});

test.describe('presentation', () => {
  test('highlights the whole row on hover, not just the label', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Paragraph' }).first()
      .hover();
    await page.getByRole('button', { name: 'Block settings' }).click();

    await expect(page.getByRole('menu', { name: 'Block settings' })).toBeVisible();

    // Regression test for the item wrapper. ui-kit renders menu items as block-level elements
    // whose width fills the menu; configuring them as `button` instead — correct for its inline
    // toolbar, where items sit in a row — made each one shrink to its own label, so the hover
    // highlight covered a ragged part of the row. Only a real layout engine catches this, which
    // is why it is asserted here rather than in the jsdom suite.
    //
    // Measured in one pass in the page, after the webfont has settled: taken one locator at a
    // time, the rows are measured at different moments and a font still loading changes the
    // menu's width between them, which WebKit reports as several pixels of drift.
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
