import CodeX from 'eslint-config-codex';

export default [
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
      'n/no-unsupported-features/node-builtins': ['error', {
        version: '>=24.0.0',
        ignores: [],
      }],
    },
  },
  {
    files: ['**/*.spec.ts', 'jest.config.ts'],
    rules: {
      /**
       * For test files allow dev dependencies imports
       */
      'n/no-unpublished-import': ['error', {
        allowModules: ['@jest/globals'],
      }],
    },
  },
];
