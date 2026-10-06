import type { JestConfigWithTsJest } from 'ts-jest';

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [ '<rootDir>/src/**/*.spec.ts' ],
  extensionsToTreatAsEsm: [ '.ts' ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
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
  },
} as JestConfigWithTsJest;
