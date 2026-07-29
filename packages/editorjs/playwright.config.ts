import process from 'node:process';
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const isCI = process.env.CI !== undefined;

export default defineConfig({
  testDir: './e2e/tests',
  // Guidepup's VoiceOver suite needs a real, headed VoiceOver instance and can't run in
  // parallel - it has its own config (playwright.voiceover.config.ts / test:e2e:voiceover).
  testIgnore: /voiceover\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    // The fixture imports this package's `src`, but that resolves `@editorjs/ui` and the tools
    // through their published `exports` — i.e. their `dist`. Without building first, the suite
    // silently audits whatever was built last, so a change to the ARIA attributes in
    // `packages/ui` can pass against the previous build of it.
    command: `yarn build:dependencies && yarn vite --config e2e/vite.config.ts --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    stdout: 'pipe',
  },
});
