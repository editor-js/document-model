import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('body[data-editor-ready="true"]');
});

test('renders the initial paragraph block', async ({ page }) => {
  const paragraph = page.locator('.editorjs-paragraph [contenteditable="true"]');

  await expect(paragraph).toBeVisible();
  await expect(paragraph).toHaveText('Hello world');
});

test('types into a paragraph block', async ({ page }) => {
  const paragraph = page.locator('.editorjs-paragraph [contenteditable="true"]');

  // A real click places the caret via the browser's native selection instead
  // of `locator.press`, which re-focuses the element programmatically and
  // drops the editor's tracked caret position.
  await paragraph.click();
  await page.keyboard.press('End');
  await page.keyboard.type('!');

  await expect(paragraph).toHaveText('Hello world!');
});

test('bolds selected text via the inline toolbar', async ({ page }) => {
  const paragraph = page.locator('.editorjs-paragraph [contenteditable="true"]');

  // Triple-click to select the paragraph's text via native browser selection,
  // same reasoning as above re: `locator.selectText` bypassing real caret tracking.
  await paragraph.click({ clickCount: 3 });

  const boldButton = page.locator('.ce-popover-item[data-item-name="bold"]');

  await expect(boldButton).toBeVisible();
  await boldButton.click();

  await expect(paragraph.locator('b')).toHaveText('Hello world');
});
