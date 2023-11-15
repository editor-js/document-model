module.exports = {
  root: true,
  extends: [
    'codex/ts',
    'plugin:vue/vue3-recommended',
  ],
  parserOptions: {
    parser: '@typescript-eslint/parser',
    tsconfigRootDir: __dirname,
    project: [
      './tsconfig.json',
      './tsconfig.eslint.json',
    ],
    ecmaVersion: 2022,
    extraFileExtensions: [ '.vue' ],
  },
  parser: 'vue-eslint-parser',
  rules: {
    'jsdoc/require-returns': 'off',
    'jsdoc/require-param-type': 'off',
  },
};
