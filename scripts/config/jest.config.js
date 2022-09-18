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

/** @type {import("ts-jest").JestConfigWithTsJest} */
module.exports = {
  clearMocks: true,
  collectCoverage: false,
  collectCoverageFrom: ["src/**/*.ts", "!src/types/*.ts", "!**/node_modules/**"],
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  testMatch: ["**/?(*.)+(spec|test).ts?(x)"],
  testPathIgnorePatterns: ["/node_modules/"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { isolatedModules: true } }],
  },
  transformIgnorePatterns: ["/node_modules/", "\\.pnp\\.[^\\/]+$"],
  watchPathIgnorePatterns: ["/node_modules/"],
  moduleNameMapper,
};
