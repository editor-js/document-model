import { expect } from '@playwright/test';
import { test } from './utils/test';

test.describe('Textarea field', () => {
  test('should be visible', async ({ playgroundPage }) => {
    const textarea = playgroundPage.textarea;

    await expect(textarea).toBeVisible();
  });

  test('should be focusable', async ({ playgroundPage }) => {
    const textarea = playgroundPage.textarea;

    await textarea.click();

    await expect(textarea).toBeFocused();
  });

  test('should accept text', async ({ playgroundPage }) => {
    const textarea = playgroundPage.textarea;
    const initialText = await textarea.inputValue();
    const inputText = 'Hello, World!';
    const expectedText = initialText + inputText;

    await textarea.click();
    await textarea.pressSequentially(inputText, { delay: 100 });

    await expect(textarea).toHaveValue(expectedText);
  });
});
