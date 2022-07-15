/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

const { defaults } = require("jest-config");

module.exports = {
  clearMocks: true,
  collectCoverage: false,
  collectCoverageFrom: ["src/**/*.ts", "!src/types/*.ts", "!**/node_modules/**"],
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  globals: {
    "ts-jest": {
      isolatedModules: true,
    },
  },
  moduleNameMapper: {
    "^.+\\.(css|jpe?g|png|svg|webp)$": "identity-obj-proxy",
    "@generated/.*": "identity-obj-proxy",
    "@docusaurus/(BrowserOnly|ComponentCreator|constants|ExecutionEnvironment|Head|Interpolate|isInternalUrl|Link|Noop|renderRoutes|router|Translate|use.*)":
      "@docusaurus/core/lib/client/exports/$1",
  },
  preset: "ts-jest/presets/js-with-ts",
  testMatch: ["**/?(*.)+(spec|test).[tj]s?(x)"],
  testPathIgnorePatterns: ["/node_modules/"],
  transformIgnorePatterns: ["/node_modules/(?!(@docusaurus)/)", "\\.pnp\\.[^\\/]+$"],
  watchPathIgnorePatterns: ["/node_modules/"],
  testEnvironment: "jest-environment-jsdom",
};
