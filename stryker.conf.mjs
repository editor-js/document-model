// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  _comment:
    "This config was generated using 'stryker init'. Please take a look at: https://stryker-mutator.io/docs/stryker-js/configuration/ for more information.",
  packageManager: "yarn",
  thresholds: {
    break: 75,
  },
  thresholds_comment: "Minimum required coverage. Increase once we're closer to 100%.",
  clearTextReporter: {
    allowEmojis: true,
  },
  reporters: [
    "html",
    "clear-text",
    "progress",
  ],
  testRunner: "jest",
  testRunner_comment:
    "Take a look at https://stryker-mutator.io/docs/stryker-js/jest-runner for information about the jest plugin.",
  coverageAnalysis: "perTest",
};

export default config;
