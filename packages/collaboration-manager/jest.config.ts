import type { JestConfigWithTsJest } from 'ts-jest';

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  modulePathIgnorePatterns: ['<rootDir>/.*/__mocks__', '<rootDir>/.*/mocks'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^codex-tooltip$': '<rootDir>/test/mocks/codex-tooltip.ts',
  },
  coverageReporters: ['lcov', 'json-summary', 'text-summary'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.test.json',
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
  transformIgnorePatterns: [
    'node_modules/(?!@editorjs)',
  ],
} as JestConfigWithTsJest;
