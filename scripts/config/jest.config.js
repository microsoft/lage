// @ts-check
const { getWorkspaceRoot, getPackageInfos } = require("workspace-tools");
const path = require("path");

const root = getWorkspaceRoot(process.cwd());
const packages = getPackageInfos(root);
const moduleNameMapper = Object.values(packages).reduce((acc, { packageJsonPath, name }) => {
  const packagePath = path.dirname(packageJsonPath);
  acc[`^${name}/(.*)$`] = `${packagePath}/src/$1`;
  acc[`^${name}$`] = `${packagePath}/src/index.ts`;
  return acc;
}, {});

moduleNameMapper["^(\\.{1,2}/.*)\\.js$"] = "$1";

/** @type {import("ts-jest").JestConfigWithTsJest} */
module.exports = {
  clearMocks: true,
  collectCoverage: false,
  collectCoverageFrom: ["src/**/*.ts", "!src/types/*.ts", "!**/node_modules/**"],
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  extensionsToTreatAsEsm: [".ts"],
  testMatch: ["**/?(*.)+(spec|test).ts?(x)"],
  testPathIgnorePatterns: ["/node_modules/"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        isolatedModules: true,
        tsconfig: {
          jsx: "react",
        },
      },
    ],
  },
  transformIgnorePatterns: ["/node_modules/", "\\.pnp\\.[^\\/]+$"],
  watchPathIgnorePatterns: ["/node_modules/"],
  moduleNameMapper,
  ...(process.env.LAGE_PACKAGE_NAME && { maxWorkers: 1 }),
  setupFilesAfterEnv: [path.join(__dirname, "jest-setup-after-env.js")],
};
