import process from 'node:process';
import { defineConfig, devices } from '@playwright/test';
import { screenReaderConfig } from '@guidepup/playwright';

const PORT = 4174;
const isCI = process.env.CI !== undefined;

/**
 * Per-test budget. Every VoiceOver command is a real keystroke against a real screen reader, so
 * a case that walks the document runs into minutes rather than the seconds the headless suite takes.
 * Five minutes.
 */
const TEST_TIMEOUT_MS = 300_000;

/**
 * Separate config from playwright.config.ts: screen readers are singletons (one VoiceOver
 * instance, can't parallelize) and can't drive a headless browser, so this suite needs
 * `workers: 1` and `headless: false` - settings that would slow the rest of the e2e suite down
 * for no reason. Run with `yarn test:e2e:voiceover`. macOS only.
 */
export default defineConfig({
  ...screenReaderConfig,
  testDir: './e2e/tests',
  testMatch: /voiceover\.spec\.ts/,
  reporter: 'list',
  timeout: TEST_TIMEOUT_MS,
  use: {
    ...screenReaderConfig.use,
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      // VoiceOver's best-supported browser on macOS - same reasoning as the webkit target
      // in playwright.config.ts and voiceover-verification.md.
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    // Builds first for the same reason as playwright.config.ts: the fixture reaches the UI
    // packages through their `dist`, so an unbuilt change is invisible to the suite.
    command: `yarn build:dependencies && yarn vite --config e2e/vite.config.ts --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    stdout: 'pipe',
  },
});
