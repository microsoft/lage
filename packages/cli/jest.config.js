module.exports = {
  ...require("@lage-run/monorepo-scripts/config/jest.config.js"),
  testTimeout: process.platform === "win32" ? 20_000 : 10_000,
};
