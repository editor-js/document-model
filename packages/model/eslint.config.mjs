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
      '@stylistic/object-curly-newline': ['error', {
        ObjectExpression: {
          multiline: true,
          consistent: true,
        },
        ObjectPattern: {
          multiline: true,
          consistent: true,
        },
        ImportDeclaration: 'never',
        ExportDeclaration: {
          multiline: true,
          minProperties: 3,
          consistent: true,
        },
        TSTypeLiteral: {
          multiline: true,
          consistent: true,
        },
      }],
      'n/no-unpublished-import': ['error', {
        allowModules: [
          'eslint-config-codex',
        ],
        ignoreTypeImport: true,
      }],
      // @todo: remove when we setup eslint to correctly handle the types
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/informative-docs': 'off',
      // @editorjs/model-types' dist isn't built before lint runs in CI
      'n/no-missing-import': ['error', {
        allowModules: ['@editorjs/model-types'],
      }],
      'n/no-unsupported-features/node-builtins': 'off',
      'n/no-unsupported-features/es-syntax': ['error', { version: '>=20.0.0' }],
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
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
