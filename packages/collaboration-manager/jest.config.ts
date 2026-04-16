import { type JestConfigWithTsJest, createDefaultEsmPreset } from 'ts-jest';

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.test.json',
    },
  },
  testMatch: [ '<rootDir>/src/**/*.spec.ts' ],
  modulePathIgnorePatterns: [ '<rootDir>/.*/__mocks__', '<rootDir>/.*/mocks' ],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    ...createDefaultEsmPreset().transform,
  },
} as JestConfigWithTsJest;
