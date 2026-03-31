const { findProjectRoot, getPackageInfos } = require("workspace-tools-npm");
const fs = require("fs");
const path = require("path");

const root = findProjectRoot(process.cwd());
const swcOptions = {
  ...JSON.parse(fs.readFileSync(path.join(root, ".swcrc"), "utf8")),
  // inline sourcemaps are required when debugging in vs code
  // (this env var is set in launch.json)
  ...(process.env.VS_CODE_DEBUG && { sourceMaps: "inline" }),
};
const packages = getPackageInfos(root);

const moduleNameMapper = /** @type {Record<string, string>} */ ({});
for (const { packageJsonPath, name } of Object.values(packages)) {
  const packagePath = path.dirname(packageJsonPath);
  moduleNameMapper[`^${name}/(.*)$`] = `${packagePath}/src/$1`;

  if (fs.existsSync(path.join(packagePath, "src/index.ts"))) {
    moduleNameMapper[`^${name}$`] = `${packagePath}/src/index.ts`;
  } else if (fs.existsSync(path.join(packagePath, "src/index.mts"))) {
    moduleNameMapper[`^${name}$`] = `${packagePath}/src/index.mts`;
  }
}

moduleNameMapper["^(\\.{1,2}/.*)\\.js$"] = "$1";

/** @type {import("jest").Config} */
const config = {
  clearMocks: true,
  passWithNoTests: true,
  extensionsToTreatAsEsm: [".ts"],
  testMatch: ["**/?(*.)+(spec|test).ts?(x)"],
  testPathIgnorePatterns: ["/node_modules/"],
  transform: {
    "^.+\\.m?tsx?$": ["@swc/jest", /** @type {*} */ (swcOptions)],
  },
  transformIgnorePatterns: ["/node_modules/", "\\.pnp\\.[^\\/]+$"],
  watchPathIgnorePatterns: ["/node_modules/"],
  moduleNameMapper,
  testTimeout: process.platform === "win32" ? 15000 : 8000,
  setupFilesAfterEnv: [path.join(__dirname, "jest-setup-after-env.js")],
  // Don't set maxWorkers based on LAGE_PACKAGE_NAME because that's handled by workers/jest.js
  // ...(process.env.LAGE_PACKAGE_NAME && { maxWorkers: 1 }),
};
module.exports = config;
