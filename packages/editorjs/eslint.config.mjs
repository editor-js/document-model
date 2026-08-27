import CodeX from 'eslint-config-codex';

export default [
  ...CodeX,
  {
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
      '@typescript-eslint/unbound-method': 'off',
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
        allowModules: ['@jest/globals'],
      }],
    },
  },
  {
    files: ['e2e/**/*.ts', 'playwright.config.ts', 'playwright.voiceover.config.ts'],
    rules: {
      /**
       * e2e tooling only ships in devDependencies, never published
       */
      'n/no-unpublished-import': ['error', {
        allowModules: ['@playwright/test', 'vite', '@axe-core/playwright', '@guidepup/playwright'],
      }],
    },
  },
];
