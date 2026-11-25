import type { JestConfigWithTsJest } from 'ts-jest';

export default {
  preset: 'ts-jest',

  /**
   * Unlike every other package in the workspace, `ui` renders DOM. The teardown suites get by
   * with fake elements, but anything asserting on real markup or a document selection needs a
   * browser-like environment, which is why `jest-environment-jsdom` is an explicit dependency.
   */
  testEnvironment: 'jsdom',
  testMatch: [ '<rootDir>/src/**/*.spec.ts' ],
  extensionsToTreatAsEsm: [ '.ts' ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',

    /**
     * CSS Modules hand back the class name itself, so an assertion on rendered markup reads as
     * the class the source asked for. `@codexteam/ui`'s themes are imported for their side
     * effects only, and Jest cannot parse the CSS behind them either.
     */
    '\\.pcss$': '<rootDir>/test/style.cjs',
    '^@codexteam/ui/styles(?:/.*)?$': '<rootDir>/test/style.cjs',
  },
  coverageReporters: ['lcov', 'json-summary', 'text-summary'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
    '^.+\\.jsx?$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
        ],
      },
    ],
  },

  /**
   * `@codexteam/*` joins `@editorjs/*` here: `@editorjs/ui-kit` is shipped as ESM and is
   * imported directly by the components under test.
   */
  transformIgnorePatterns: [
    'node_modules/(?!@editorjs|@codexteam)',
  ],
} as JestConfigWithTsJest;
