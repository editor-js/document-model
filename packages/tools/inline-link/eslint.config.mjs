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
      /**
       * @todo remove when sdk's emitted declarations stop leaking the unresolvable `@/` path alias
       * (see EditorAPI type reaching this package through InlineToolConstructorOptions)
       */
      '@typescript-eslint/no-unsafe-assignment': 'off',
      'n/no-unsupported-features/node-builtins': ['error', {
        version: '>=24.0.0',
        ignores: [],
      }],
    },
  },
];
