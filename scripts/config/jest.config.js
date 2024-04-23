// @ts-check
const { findProjectRoot, getPackageInfos } = require("workspace-tools");
const path = require("path");
const swcOptions = require("./swc");

const root = findProjectRoot(process.cwd()) ?? process.cwd();
const packages = getPackageInfos(root);
const moduleNameMapper = Object.values(packages).reduce((acc, { packageJsonPath, name }) => {
  const packagePath = path.dirname(packageJsonPath);
  acc[`^${name}/(.*)$`] = `${packagePath}/src/$1`;
  acc[`^${name}$`] = `${packagePath}/src/index.ts`;
  return acc;
}, {});

moduleNameMapper["^(\\.{1,2}/.*)\\.js$"] = "$1";

/** @type {import("jest").Config} */
const config = {
  clearMocks: true,
  extensionsToTreatAsEsm: [".ts"],
  testMatch: ["**/?(*.)+(spec|test).ts?(x)"],
  testPathIgnorePatterns: ["/node_modules/"],
  transform: {
    "^.+\\.tsx?$": ["@swc/jest", /** @type {*} */ (swcOptions)],
  },
  transformIgnorePatterns: ["/node_modules/", "\\.pnp\\.[^\\/]+$"],
  watchPathIgnorePatterns: ["/node_modules/"],
  moduleNameMapper,
  ...(process.env.LAGE_PACKAGE_NAME && { maxWorkers: 1 }),
  setupFilesAfterEnv: [path.join(__dirname, "jest-setup-after-env.js")],
};
module.exports = config;
