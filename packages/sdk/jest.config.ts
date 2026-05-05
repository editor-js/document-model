import type { JestConfigWithTsJest } from 'ts-jest';

export default {
  preset: 'ts-jest',
  // SDK tests require a browser-like environment ('codex-tooltip' accesses `window`), use jsdom
  // @todo refactor tooltip package to not use window on the root level
  testEnvironment: 'jsdom',
  testMatch: [ '<rootDir>/src/**/*.spec.ts' ],
  extensionsToTreatAsEsm: [ '.ts' ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
} as JestConfigWithTsJest;
