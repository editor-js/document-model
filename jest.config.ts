import { JestConfigWithTsJest } from 'ts-jest';

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePathIgnorePatterns: [ '<rootDir>/.*/__mocks__' ],
} as JestConfigWithTsJest;
