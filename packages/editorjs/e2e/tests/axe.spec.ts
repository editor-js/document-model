import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mountDocument, selectParagraphText } from '../support/editor.js';

test.beforeEach(async ({ page }) => {
  await mountDocument(page);
});

/** Upper bound on waiting for the popovers' show animation, so a stuck one fails rather than hangs. */
const ANIMATION_TIMEOUT = 5_000;

/**
 * Runs the audit over the editor once the UI has stopped moving.
 *
 * Structural/static accessibility checks (missing names, invalid roles, contrast, etc.). These
 * catch a different class of bug than aria.spec.ts: axe flags anything that violates WCAG rules
 * regardless of whether a test happens to assert on it, but it can't tell us whether a screen
 * reader announces the *right* thing - that's what voiceover.spec.ts is for.
 *
 * The wait is not incidental. The popovers fade and grow in over ~100ms, and axe samples computed
 * styles at the moment it runs, so an audit taken mid-animation measures a half-transparent panel
 * and can report a violation that doesn't exist once it has settled. This suite failed exactly
 * once that way, under a loaded parallel run, and never reproduced in isolation - so waiting for
 * animations is a fix for the likeliest cause rather than a confirmed one, which is why the
 * assertion below also names the offending rule.
 * @param page - Playwright page the editor is mounted on
 * @returns axe violations found, as `id (impact)` summaries
 */
async function auditEditor(page: Page): Promise<string[]> {
  await page.waitForFunction(
    () => document.getAnimations().every(animation => animation.playState !== 'running'),
    undefined,
    { timeout: ANIMATION_TIMEOUT }
  );

  const results = await new AxeBuilder({ page }).include('#editorjs')
    .analyze();

  // Summarised rather than asserted on the raw objects: a failure on the full result prints a
  // wall of serialised nodes with the rule id buried in it, which is how the one failure this
  // suite has had went unexplained.
  return results.violations.map(violation => `${violation.id} (${violation.impact ?? 'unknown'}): ${violation.help}`);
}

test('has no automatically detectable accessibility violations on load', async ({ page }) => {
  expect(await auditEditor(page)).toEqual([]);
});

test('has no automatically detectable accessibility violations with the toolbox open', async ({ page }) => {
  await page.getByRole('button', { name: 'Add block' }).click();
  await expect(page.getByRole('menu', { name: 'Add block' })).toBeVisible();

  expect(await auditEditor(page)).toEqual([]);
});

test('has no automatically detectable accessibility violations with the inline toolbar open', async ({ page }) => {
  await selectParagraphText(page);
  await expect(page.getByRole('toolbar', { name: 'Text formatting' })).toBeVisible();

  expect(await auditEditor(page)).toEqual([]);
});

test('has no automatically detectable accessibility violations while the inline toolbar is navigated', async ({ page }) => {
  await selectParagraphText(page);
  await expect(page.getByRole('toolbar', { name: 'Text formatting' })).toBeVisible();

  // A separate state rather than a step in the case above: `aria-owns` and
  // `aria-activedescendant` only exist once an item is highlighted, so the open-but-unnavigated
  // audit never sees either of them. Axe checks that both resolve to real elements, which is
  // the cheap half of what makes the reference followable at all (the other half - that the
  // named item sits inside the owned subtree - is asserted in aria.spec.ts).
  await page.keyboard.press('ArrowDown');

  await expect(page.getByRole('group')).toHaveAttribute('aria-activedescendant', /.+/);

  expect(await auditEditor(page)).toEqual([]);
});
