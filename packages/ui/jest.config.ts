import type { JestConfigWithTsJest } from 'ts-jest';

export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: [ '<rootDir>/src/**/*.spec.ts' ],
  modulePathIgnorePatterns: [ '<rootDir>/.*/__mocks__' ],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    /**
     * CSS modules and bare style imports have no runtime meaning in tests,
     * so they are replaced with an identity proxy
     */
    '\\.(pcss|css)$': '<rootDir>/test/mocks/styleMock.cjs',
    '^@codexteam/ui/styles.*$': '<rootDir>/test/mocks/styleMock.cjs',
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
  transformIgnorePatterns: [
    'node_modules/(?!@editorjs)',
  ],
} as JestConfigWithTsJest;
