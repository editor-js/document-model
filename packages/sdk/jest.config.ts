import type { JestConfigWithTsJest } from 'ts-jest';

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [ '<rootDir>/src/**/*.spec.ts' ],
  extensionsToTreatAsEsm: [ '.ts' ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/src/$1',
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
  transformIgnorePatterns: [
    'node_modules/(?!@editorjs)',
  ],
} as JestConfigWithTsJest;
