import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('has title', async ({ page }) => {
  await expect(page).toHaveTitle(/Playground/);
});

test.describe('input field', () => {
  test('should be visible', async ({ page }) => {
    const input = page.getByRole('textbox');

    await expect(input).toBeVisible();
  });

  test('should be focusable', async ({ page }) => {
    const input = page.getByRole('textbox');

    await input.click();

    await expect(input).toBeFocused();
  });

  test('should accept text', async ({ page }) => {
    const input = page.getByRole('textbox');

    await input.pressSequentially('Hello, World!', { delay: 100 });

    await expect(input).toHaveText('Hello, World!');
  });
});
