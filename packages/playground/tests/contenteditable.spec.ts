import { expect } from '@playwright/test';
import { test } from './utils/test';

test.describe('Contenteditable field', () => {
  test('should be visible', async ({ playgroundPage }) => {
    const contenteditable = playgroundPage.contenteditable;

    await expect(contenteditable).toBeVisible();
  });

  test('should be focusable', async ({ playgroundPage }) => {
    const contenteditable = playgroundPage.contenteditable;

    await contenteditable.click();

    await expect(contenteditable).toBeFocused();
  });

  test('should accept text', async ({ playgroundPage }) => {
    const contenteditable = playgroundPage.contenteditable;
    const initialText = await contenteditable.textContent();
    const inputText = 'Hello, World!';
    const expectedText = initialText + inputText;

    await contenteditable.click();
    await contenteditable.pressSequentially(inputText);

    await expect(contenteditable).toHaveText(expectedText);
  });
});
