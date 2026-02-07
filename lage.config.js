// @ts-check
/** @import { ConfigOptions, CacheOptions } from 'lage' */
const path = require("path");
const fastGlob = require("fast-glob");

/**
 * Lage config (the types are slightly incorrect about what's required/optional)
 * @type {Partial<Omit<ConfigOptions, 'cacheOptions'>> & { cacheOptions?: Partial<CacheOptions> }}
 */
const config = {
  pipeline: {
    "lage#bundle": ["^^transpile", "types"],
    // Note that transpile/types/bundle are overridden later for the @lage-run/globby package
    types: {
      type: "worker",
      options: {
        worker: path.join(__dirname, "scripts/worker/types.js"),
      },
      dependsOn: ["^types"],
      outputs: ["lib/**/*.d.{ts,mts}"],
    },
    isolatedTypes: {
      type: "worker",
      options: {
        worker: path.join(__dirname, "scripts/worker/types.js"),
      },
      dependsOn: [],
      outputs: ["lib/**/*.d.{ts,mts}"],
    },
    transpile: {
      type: "worker",
      options: {
        worker: path.join(__dirname, "scripts/worker/transpile.js"),
      },
      outputs: ["lib/**/*.{js,map}"],
    },
    test: {
      type: "worker",
      weight: (target) => {
        return fastGlob.sync("tests/**/*.test.ts", { cwd: target.cwd }).length;
      },
      options: {
        worker: path.join(__dirname, "scripts/worker/jest.js"),
      },
      dependsOn: ["build"],
    },
    build: {
      type: "noop",
      dependsOn: ["transpile", "types"],
    },
    "@lage-run/globby#types": {
      type: "npmScript",
    },
    "@lage-run/globby#transpile": {
      type: "npmScript",
    },
    "@lage-run/globby#isolatedTypes": {
      type: "npmScript",
      options: {
        script: "types",
      },
    },
    lint: {
      type: "worker",
      options: {
        worker: path.join(__dirname, "scripts/worker/lint.js"),
      },
    },
    depcheck: {
      type: "worker",
      options: {
        worker: path.join(__dirname, "scripts/worker/depcheck.js"),
      },
    },
    "@lage-run/e2e-tests#test": {
      type: "npmScript",
      dependsOn: ["^^transpile", "lage#bundle"],
    },
  },
  npmClient: "yarn",
  cacheOptions: {
    // These are relative to the git root, and affect the hash of the cache.
    // Changes to any of these files will invalidate the cache.
    environmentGlob: [
      // Folder globs MUST end with **/* to include all files!
      "!node_modules/**/*",
      "!**/node_modules/**/*",
      ".github/workflows/*",
      "beachball.config.js",
      "lage.config.js",
      "package.json",
      "scripts/**/*",
      "yarn.lock",
    ],
    // Subset of files in package directories that will be saved into the cache.
    outputGlob: ["lib/**/*", "dist/**/*", ".docusaurus/**/*", "build/**/*"],
  },
};

module.exports = config;
