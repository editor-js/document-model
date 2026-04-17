// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: 'yarn',
  thresholds: {
    break: 0,
  },
  // eslint-disable-next-line camelcase
  thresholds_comment: 'Minimum required coverage. Increase once we\'re closer to 100%.',
  clearTextReporter: {
    allowEmojis: true,
  },
  reporters: [
    'html',
    'clear-text',
    'progress',
    'dashboard',
  ],
  testRunner: 'jest',
  coverageAnalysis: 'perTest',
  tsconfigFile: 'tsconfig.json',
  checkers: ['typescript'],
  timeoutMS: 10000,
  mutate: ['./src/**/*.ts', '!./src/**/__mocks__/*.ts', '!./src/**/*.spec.ts'],
  allowEmpty: true,
};

export default config;
