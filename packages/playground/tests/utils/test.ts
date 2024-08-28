import { test as base  } from '@playwright/test';
import { PlaygroundPage } from '../fixtures/PlaygroundPage';

/**
 *
 */
export const test = base.extend<{ playgroundPage: PlaygroundPage }>({
  playgroundPage: async ({ page }, use) => {
    const playgroundPage = new PlaygroundPage(page);

    await playgroundPage.goto();

    await use(playgroundPage);
  },
});
