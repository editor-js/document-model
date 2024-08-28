import { expect } from '@playwright/test';
import { test } from './utils/test';

test.describe('Native input element', () => {
  test('should be visible', async ({ playgroundPage }) => {
    const input = playgroundPage.input;

    await expect(input).toBeVisible();
  });

  test('should be focusable', async ({ playgroundPage }) => {
    const input = playgroundPage.input;

    await input.click();

    await expect(input).toBeFocused();
  });

  test('should accept text', async ({ playgroundPage }) => {
    const input = playgroundPage.input;
    const initialText = await input.inputValue();
    const inputText = 'Hello, World!';
    const expectedText = initialText + inputText;

    await input.click();
    await input.pressSequentially(inputText, { delay: 100 });

    await expect(input).toHaveValue(expectedText);
  });
});
