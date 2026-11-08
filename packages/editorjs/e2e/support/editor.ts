import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { DEFAULT_PLACEHOLDER } from '../fixtures/constants.js';

/**
 * Helpers shared by every spec in this suite. They live outside `e2e/tests` so Playwright's
 * default `testMatch` can't mistake them for a spec file.
 */

/**
 * The placeholder the fixture configures; the paragraph tool exposes it as `aria-placeholder`.
 *
 * Re-exported from the fixture's own constants rather than repeated here, so that changing what
 * the fixture mounts can't leave the specs asserting a string it no longer uses
 */
export const PLACEHOLDER = DEFAULT_PLACEHOLDER;

/**
 * Mounts the fixture and waits until the editor reports itself ready.
 *
 * The fixture builds one paragraph per `text` search param (see e2e/fixtures/main.ts), so
 * `search` is how a test gets a document other than the default single "Hello world" block:
 * `?text=Alpha&text=Beta` for several, `?text=` for an empty one.
 * @param page - Playwright page to mount the editor on
 * @param search - query string to mount with, e.g. `?text=Alpha&text=Beta`
 */
export async function mountDocument(page: Page, search = ''): Promise<void> {
  await page.goto(`/${search}`);
  await page.waitForSelector('body[data-editor-ready="true"]');
}

/**
 * Selects the whole text of the paragraph the way a user would, so that the editor's own
 * caret tracking sees it. `locator.selectText()` bypasses that and the inline toolbar never
 * appears - see the gotcha section of e2e/README.md.
 * @param page - Playwright page the editor is mounted on
 */
export async function selectParagraphText(page: Page): Promise<void> {
  await page.getByRole('textbox', { name: 'Paragraph' }).click({ clickCount: 3 });
}

/** Upper bound on Tab presses when reaching a tool, so a missing one fails fast. */
const MAX_TAB_PRESSES = 5;

/**
 * Tabs from the current position until `button` holds real DOM focus.
 *
 * Tab order among the inline tools is deliberately not asserted anywhere, so tests reach a
 * specific one by Tabbing until the DOM confirms it rather than hardcoding a press count.
 * @param page - Playwright page the editor is mounted on
 * @param button - locator for the inline tool button to land on
 */
export async function tabToInlineTool(page: Page, button: Locator): Promise<void> {
  for (
    let presses = 0;
    presses < MAX_TAB_PRESSES && !(await button.evaluate(el => el === document.activeElement));
    presses++
  ) {
    await page.keyboard.press('Tab');
  }

  await expect(button).toBeFocused();
}
