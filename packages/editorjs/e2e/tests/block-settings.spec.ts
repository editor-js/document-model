import { test, expect } from '@playwright/test';
import { mountDocument } from '../support/editor.js';

/**
 * The toolbar follows whichever block the pointer is over, so a test opens settings for a
 * particular block by hovering it first and then clicking the toolbar's settings button.
 */

test.beforeEach(async ({ page }) => {
  await mountDocument(page, '?text=Alpha&text=Beta');
});

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

test('disables moving further at the document boundaries', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Paragraph' }).first()
    .hover();
  await page.getByRole('button', { name: 'Block settings' }).click();

  const menu = page.getByRole('menu', { name: 'Block settings' });

  await expect(menu.getByRole('menuitem', { name: 'Move up' })).toBeDisabled();
  await expect(menu.getByRole('menuitem', { name: 'Move down' })).toBeEnabled();
});

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
