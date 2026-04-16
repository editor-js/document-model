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
        project: './tsconfig.json',
        tsconfigRootDir: './',
        sourceType: 'module',
      },
    },
    rules: {
      'n/no-unpublished-import': ['error', {
        allowModules: [
          '@jest/globals',
          'eslint-config-codex',
          'jest',
          'ts-jest',
        ],
        ignoreTypeImport: true,
      }],
      'n/no-missing-import': 'off',
    },
  },
];
