import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('body[data-editor-ready="true"]');
});

test('renders the initial paragraph block', async ({ page }) => {
  const paragraph = page.getByRole('textbox', { name: 'Paragraph' });

  await expect(paragraph).toBeVisible();
  await expect(paragraph).toHaveText('Hello world');
});

test('types into a paragraph block', async ({ page }) => {
  const paragraph = page.getByRole('textbox', { name: 'Paragraph' });

  // A real click places the caret via the browser's native selection instead
  // of `locator.press`, which re-focuses the element programmatically and
  // drops the editor's tracked caret position.
  await paragraph.click();
  await page.keyboard.press('End');
  await page.keyboard.type('!');

  await expect(paragraph).toHaveText('Hello world!');
});

test('bolds selected text via the inline toolbar', async ({ page }) => {
  const paragraph = page.getByRole('textbox', { name: 'Paragraph' });

  // Triple-click to select the paragraph's text via native browser selection,
  // same reasoning as above re: `locator.selectText` bypassing real caret tracking.
  await paragraph.click({ clickCount: 3 });

  const boldButton = page.getByRole('button', { name: 'Bold' });

  await expect(boldButton).toBeVisible();
  await boldButton.click();

  await expect(paragraph.locator('b')).toHaveText('Hello world');
});

test('keeps the inline toolbar open when its own control holds focus and the native selection drops', async ({ page }) => {
  const paragraph = page.getByRole('textbox', { name: 'Paragraph' });

  await paragraph.click({ clickCount: 3 });

  const boldButton = page.getByRole('button', { name: 'Bold' });

  await expect(boldButton).toBeVisible();
  await boldButton.focus();

  /**
   * Real Safari drops the text selection as a side effect once VoiceOver moves focus onto a
   * button (see the `PopoverInline` class comment in ui-kit) - not reproducible through a
   * plain Playwright click/focus on either engine, since `getSelection()` stays intact here.
   * Simulating the resulting native selectionchange directly exercises the same code path:
   * without the fix, the toolbar reads this as the user dismissing it and tears itself down.
   */
  await page.evaluate(() => window.getSelection()?.removeAllRanges());

  await expect(page.getByRole('toolbar', { name: 'Text formatting' })).toBeVisible();
});

test('opens the link tool\'s URL input instead of closing the toolbar', async ({ page }) => {
  const paragraph = page.getByRole('textbox', { name: 'Paragraph' });

  await paragraph.click({ clickCount: 3 });

  const linkButton = page.getByRole('button', { name: 'Link' });

  await expect(linkButton).toBeVisible();
  await linkButton.click();

  const linkInput = page.getByPlaceholder('Add a link');

  await expect(linkInput).toBeVisible();

  await linkInput.fill('https://editorjs.io');
  await linkInput.press('Enter');

  await expect(paragraph.locator('a[href="https://editorjs.io"]')).toHaveText('Hello world');
});
