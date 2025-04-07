import { type JestConfigWithTsJest, createDefaultEsmPreset } from 'ts-jest';

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [ '<rootDir>/src/**/*.spec.ts' ],
  modulePathIgnorePatterns: [ '<rootDir>/.*/__mocks__', '<rootDir>/.*/mocks' ],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    ...createDefaultEsmPreset().transform,
  },
  "transformIgnorePatterns": [
    "packages/model"
  ]
} as JestConfigWithTsJest;
