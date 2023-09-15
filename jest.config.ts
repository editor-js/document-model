import { JestConfigWithTsJest } from 'ts-jest';

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [ '<rootDir>/src/**/*.spec.ts' ],
  modulePathIgnorePatterns: [ '<rootDir>/.*/__mocks__' ],
} as JestConfigWithTsJest;
