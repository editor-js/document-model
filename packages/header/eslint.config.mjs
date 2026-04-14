import CodeX from 'eslint-config-codex';

export default [
  ...CodeX,

  {
    ignores: ['vite.config.ts', 'postcss.config.js'],
  },

  {
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
          'eslint-config-codex',
        ],
        ignoreTypeImport: true,
      }],
      'n/no-missing-import': 'off',
    },
  },
];
