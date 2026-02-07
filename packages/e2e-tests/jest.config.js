const baseConfig = require("@lage-run/monorepo-scripts/config/jest.config.js");

module.exports = {
  ...baseConfig,
  testTimeout: baseConfig.testTimeout * 2,
};
