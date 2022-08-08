const {getWorkspaceRoot, getPackageInfos} = require('workspace-tools');
const path = require('path');

const root = getWorkspaceRoot(process.cwd());
const packages = getPackageInfos(root);
const moduleNameMapper = Object.values(packages).reduce((acc, {
  packageJsonPath,
  name
}) => {
  const packagePath = path.dirname(packageJsonPath);
  acc[`^${name}/(.*)$`] = `${packagePath}/src/$1`;
  acc[`^${name}$`] = `${packagePath}/src/index.ts`;
  return acc;
}, {});

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
  preset: "ts-jest",
  testMatch: ["**/?(*.)+(spec|test).ts?(x)"],
  testPathIgnorePatterns: ["/node_modules/"],
  transformIgnorePatterns: ["/node_modules/", "\\.pnp\\.[^\\/]+$"],
  watchPathIgnorePatterns: ["/node_modules/"],
  moduleNameMapper
};
