import { type JestConfigWithTsJest, createDefaultEsmPreset } from 'ts-jest';

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  modulePathIgnorePatterns: ['<rootDir>/.*/__mocks__', '<rootDir>/.*/mocks'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^codex-tooltip$': '<rootDir>/test/mocks/codex-tooltip.ts',
  },
  coverageReporters: ['lcov', 'json-summary', 'text-summary'],
  transform: {
    ...createDefaultEsmPreset().transform,
  },
} as JestConfigWithTsJest;
