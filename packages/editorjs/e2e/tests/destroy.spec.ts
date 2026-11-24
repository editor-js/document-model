import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mountDocument } from '../support/editor.js';
import { activeListeners, trackListeners } from '../support/listeners.js';

/**
 * Milliseconds to wait for the browser to report an unhandled rejection
 */
const REPORTING_DELAY = 100;

/**
 * The slice of `EditorJS` the tests drive from inside the page
 */
interface PageEditor {
  /**
   * Settles when initialization finishes
   */
  isReady: Promise<void>;

  /**
   * Tears the editor down
   */
  destroy(): void;
}

/**
 * Globals the fixture exposes (see e2e/fixtures/main.ts), plus the editors these tests mount
 */
interface FixtureWindow {
  /**
   * The bundle's editor class
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors the class the fixture exposes
  EditorJS: new (config: Record<string, unknown>) => PageEditor;

  /**
   * Editors mounted by {@link mountExtraEditors}
   */
  mounted: PageEditor[];
}

/**
 * Mounts editors in new holders `#extra-0`, `#extra-1`, … next to the fixture's own editor and waits until they're ready
 * @param page - Playwright page with the fixture loaded
 * @param count - number of editors to mount
 * @param config - extra editor config, e.g. `collaborationServer`
 */
async function mountExtraEditors(page: Page, count: number, config: Record<string, unknown> = {}): Promise<void> {
  await page.evaluate(async ({ count: total, config: extra }) => {
    const fixture = window as unknown as FixtureWindow;

    fixture.mounted = Array.from({ length: total }, (_, index) => {
      const holder = document.createElement('div');

      holder.id = `extra-${index}`;
      document.body.appendChild(holder);

      return new fixture.EditorJS({
        holder,
        data: { blocks: [{ type: 'paragraph',
          data: { text: `Extra ${index}` } }] },
        ...extra,
      });
    });

    await Promise.all(fixture.mounted.map(editor => editor.isReady));
  }, { count,
    config });
}

/**
 * Destroys every editor mounted by {@link mountExtraEditors}
 * @param page - Playwright page the editors are mounted on
 */
async function destroyExtraEditors(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as FixtureWindow).mounted.forEach(editor => editor.destroy());
  });
}

test.beforeEach(async ({ page }) => {
  await trackListeners(page);
  await mountDocument(page);
});

test('removes the document and window listeners of destroyed editors', async ({ page }) => {
  // Baseline from a page that never had an editor: with one alive, listeners shared between
  // editors (the document selectionchange watcher) are already in the baseline and a leak of
  // them would go unnoticed
  await mountDocument(page, '?editors=0');

  const before = await activeListeners(page, { global: true });

  await mountExtraEditors(page, 2);
  await destroyExtraEditors(page);

  expect(await activeListeners(page, { global: true })).toEqual(before);
});

test('leaves no hint tooltip or its listeners behind once a hint has been shown', async ({ page }) => {
  // Same baseline as above. Showing a hint creates ui-kit's page-wide tooltip, which used to keep
  // its element in <body> and a window scroll listener for the life of the page
  await mountDocument(page, '?editors=0');

  const before = await activeListeners(page, { global: true });

  await mountExtraEditors(page, 1);
  await page.locator('#extra-0').getByRole('textbox', { name: 'Paragraph' })
    .click({ clickCount: 3 });
  await page.locator('#extra-0').getByRole('button', { name: /bold/i })
    .hover();
  await expect(page.locator('.ct--shown')).toHaveCount(1);

  await destroyExtraEditors(page);

  // The tooltip lets its hiding transition play before it releases the element
  await expect(page.locator('.ct')).toHaveCount(0);
  expect(await activeListeners(page, { global: true })).toEqual(before);
});

test('keeps the other editors on the page working after one is destroyed', async ({ page }) => {
  await mountExtraEditors(page, 2);
  await destroyExtraEditors(page);

  const paragraph = page.locator('#editorjs').getByRole('textbox', { name: 'Paragraph' });

  await paragraph.click();
  await page.keyboard.press('End');
  await page.keyboard.type('!');

  await expect(paragraph).toHaveText('Hello world!');
});

test('leaves destroyed editors\' holders empty, with no listeners inside', async ({ page }) => {
  await mountExtraEditors(page, 2);
  await destroyExtraEditors(page);

  for (const holderSelector of ['#extra-0', '#extra-1']) {
    await expect(page.locator(holderSelector)).toBeEmpty();
    expect(await activeListeners(page, { holderSelector })).toEqual([]);
  }
});

test('rejects isReady with an AbortError when destroyed before it is ready', async ({ page }) => {
  const rejection = await page.evaluate(async () => {
    const fixture = window as unknown as FixtureWindow;
    const holder = document.createElement('div');

    document.body.appendChild(holder);

    const editor = new fixture.EditorJS({ holder });

    editor.destroy();

    return editor.isReady.then(() => 'resolved', (error: unknown) => (error as Error).name);
  });

  expect(rejection).toBe('AbortError');
});

test('does not report an unhandled rejection when destroyed before it is ready', async ({ page }) => {
  const errors: string[] = [];

  page.on('pageerror', error => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  await page.evaluate(async (delay) => {
    const holder = document.createElement('div');

    document.body.appendChild(holder);
    new (window as unknown as FixtureWindow).EditorJS({ holder }).destroy();

    // Give an unhandled rejection the chance to be reported
    await new Promise(resolve => setTimeout(resolve, delay));
  }, REPORTING_DELAY);

  expect(errors).toEqual([]);
});

test('leaves the holder empty when destroyed before it is ready', async ({ page }) => {
  await page.evaluate(() => {
    const holder = document.createElement('div');

    holder.id = 'early';
    document.body.appendChild(holder);
    new (window as unknown as FixtureWindow).EditorJS({ holder }).destroy();
  });

  await expect(page.locator('#early')).toBeEmpty();
});

test('closes the collaboration socket on destroy', async ({ page }) => {
  let connected: () => void = () => undefined;
  const connection = new Promise<void>((resolve) => {
    connected = resolve;
  });
  let closed: () => void = () => undefined;
  const closure = new Promise<void>((resolve) => {
    closed = resolve;
  });

  // Mock server: accept the connection and record when the client closes it
  await page.routeWebSocket(/^ws:\/\/collaboration\.test\//, (socket) => {
    connected();
    socket.onClose(() => closed());
  });

  // WebSocket routes only apply to pages loaded after they're registered, so reload the fixture
  await mountDocument(page);
  await mountExtraEditors(page, 1, { collaborationServer: 'ws://collaboration.test/document' });
  await connection;

  await destroyExtraEditors(page);

  await expect(closure).resolves.toBeUndefined();
});
