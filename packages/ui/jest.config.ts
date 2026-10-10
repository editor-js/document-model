import type { JestConfigWithTsJest } from 'ts-jest';

export default {
  preset: 'ts-jest',

  /**
   * Unlike every other package in the workspace, `ui` renders DOM. It is the first
   * package here to need a browser-like environment, which is why `jest-environment-jsdom`
   * is an explicit dependency rather than something inherited from another config.
   */
  testEnvironment: 'jsdom',
  testMatch: [ '<rootDir>/src/**/*.spec.ts' ],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    /**
     * `src/index.ts` imports `@codexteam/ui`'s themes for their side effects only.
     * There is no JS behind them to exercise, and Jest cannot parse the CSS.
     */
    '^@codexteam/ui/styles.*$': '<rootDir>/test/emptyModule.cjs',

    /**
     * CSS Modules hand back the class name itself, so an assertion on rendered
     * markup reads as the class the source asked for.
     */
    '\\.pcss$': '<rootDir>/test/styleMock.cjs',
    '^(\\.{1,2}/.*)\\.js$': '$1',
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
   * `@codexteam/*` joins `@editorjs/*` here: `@editorjs/ui-kit` is shipped as ESM
   * and is imported directly by the components under test.
   */
  transformIgnorePatterns: [
    'node_modules/(?!@editorjs|@codexteam)',
  ]
} as JestConfigWithTsJest;
