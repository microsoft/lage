/** @import { WorkerRunnerFunction } from "../types.js" */
const depcheck = require("depcheck");
const path = require("path");
const { findProjectRoot } = require("workspace-tools");

const root = findProjectRoot(process.cwd());

/**
 * Add deps here that aren't detected correctly
 * @type {Record<string, string[]>}
 */
const extraIgnoreMatches = {
  "@lage-run/monorepo-scripts": ["@typescript-eslint/*", "eslint-plugin-file-extension-in-import-ts", "@types/*"],
  "@lage-run/rpc": ["@bufbuild/protoc-gen-es", "@connectrpc/protoc-gen-connect-es"],
  "@lage-run/e2e-tests": ["@lage-run/cli"],
  lage: ["@lage-run/cli", "@lage-run/runners"],
};

/**
 * @type {WorkerRunnerFunction}
 */
async function depcheckWorker({ target }) {
  if (!target.packageName) return;

  const results = await depcheck(target.cwd, {
    ignoreBinPackage: false,
    ignorePatterns: ["node_modules", "dist", "lib", "build"],
    ignoreMatches: ["glob-hasher", ...(extraIgnoreMatches[target.packageName] || [])],
  });

  let hasErrors = false;
  let formattedError = `Depcheck errors detected in ${target.packageName}\n\n`;

  if (results.dependencies.length > 0) {
    hasErrors = true;
    formattedError += `Unused dependency: \n`;
    for (const dep of results.dependencies) {
      formattedError += `  ${dep}\n`;
    }
  }

  if (results.devDependencies.length > 0) {
    hasErrors = true;
    formattedError += `Unused devDependency: \n`;
    for (const dep of results.devDependencies) {
      formattedError += `  ${dep}\n`;
    }
  }

  if (Object.keys(results.missing).length > 0) {
    hasErrors = true;
    formattedError += `Missing dependency: \n`;
    for (const [key, value] of Object.entries(results.missing)) {
      formattedError += `  ${key} is used by: ${value.map((file) => path.relative(root, file)).join(", ")}\n`;
    }
  }

  if (hasErrors) {
    throw new Error(`${formattedError}\n\n(If this is incorrect, update the exceptions in ${__filename})`);
  }
}

module.exports = depcheckWorker;
