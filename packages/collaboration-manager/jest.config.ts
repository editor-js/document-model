import { type JestConfigWithTsJest, createDefaultEsmPreset } from 'ts-jest';

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.test.json',
    },
  },
  coverageReporters: ['lcov', 'json-summary', 'text-summary'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  modulePathIgnorePatterns: ['<rootDir>/.*/__mocks__', '<rootDir>/.*/mocks'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^codex-tooltip$': '<rootDir>/test/mocks/codex-tooltip.ts',
  },
  transform: {
    ...createDefaultEsmPreset().transform,
  },
} as JestConfigWithTsJest;
