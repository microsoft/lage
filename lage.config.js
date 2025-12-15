// @ts-check
const path = require("path");
const fastGlob = require("fast-glob");

/** @type {import("lage").ConfigOptions} */
module.exports = {
  pipeline: {
    "lage#bundle": ["^^transpile", "types"],
    types: {
      type: "worker",
      options: {
        worker: path.join(__dirname, "scripts/worker/types.js"),
      },
      dependsOn: ["^types"],
      outputs: ["lib/**/*.d.ts"],
    },
    isolatedTypes: {
      type: "worker",
      options: {
        worker: path.join(__dirname, "scripts/worker/types.js"),
      },
      dependsOn: [],
      outputs: ["lib/**/*.d.ts"],
    },
    transpile: {
      type: "worker",
      options: {
        worker: path.join(__dirname, "scripts/worker/transpile.js"),
      },
      outputs: ["lib/**/*.js"],
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
      "packages/tsconfig.lage2.json",
      "patches/**/*",
      "yarn.lock",
    ],
    // Subset of files in package directories that will be saved into the cache.
    outputGlob: ["lib/**/*", "dist/**/*", ".docusaurus/**/*", "build/**/*"],
  },
};
