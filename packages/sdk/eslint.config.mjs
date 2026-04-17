import CodeX from 'eslint-config-codex';

export default [
  {
    ignores: ['jest.config.ts'],
  },
  ...CodeX,
  {
    /**
     * Override path to the tsconfig.json file.
     */
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
        sourceType: 'module',
      },
    },
    rules: {
      'n/no-unpublished-import': ['error', {
        allowModules: [
          'eslint-config-codex',
        ],
        ignoreTypeImport: true,
      }],
      'n/no-missing-import': 'off',
      'n/no-unsupported-features/node-builtins': ['error', {
        version: '>=24.0.0',
        ignores: [],
      }],
    },
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      /**
       * For test files allow dev dependencies imports
       */
      'n/no-unpublished-import': ['error', {
        allowModules: ['@jest/globals', 'ts-jest'],
      }],
    },
  },
];
