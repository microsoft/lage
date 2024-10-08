// @ts-check
const { findProjectRoot, getPackageInfos } = require("workspace-tools");
const fs = require("fs");
const path = require("path");

const root = findProjectRoot(process.cwd()) ?? process.cwd();
const swcOptions = JSON.parse(fs.readFileSync(path.join(root, ".swcrc"), "utf8"));
const packages = getPackageInfos(root);
const moduleNameMapper = Object.values(packages).reduce((acc, { packageJsonPath, name }) => {
  if (name === "@lage-run/globby") {
    return acc;
  }

  const packagePath = path.dirname(packageJsonPath);
  acc[`^${name}/(.*)$`] = `${packagePath}/src/$1`;

  if (fs.existsSync(path.join(packagePath, "src/index.ts"))) {
    acc[`^${name}$`] = `${packagePath}/src/index.ts`;
  } else if (fs.existsSync(path.join(packagePath, "src/index.mts"))) {
    acc[`^${name}$`] = `${packagePath}/src/index.mts`;
  }

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
    "^.+\\.m?tsx?$": ["@swc/jest", /** @type {*} */ (swcOptions)],
  },
  transformIgnorePatterns: ["/node_modules/", "\\.pnp\\.[^\\/]+$"],
  watchPathIgnorePatterns: ["/node_modules/"],
  moduleNameMapper,
  ...(process.env.LAGE_PACKAGE_NAME && { maxWorkers: 1 }),
  testTimeout: process.platform === "win32" ? 10000 : 5000,
  setupFilesAfterEnv: [path.join(__dirname, "jest-setup-after-env.js")],
};
module.exports = config;
