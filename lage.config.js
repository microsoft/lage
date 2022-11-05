// @ts-check
const path = require("path");
const fastGlob = require("fast-glob");

/** @type {import("@lage-run/cli").ConfigOptions} */
module.exports = {
  pipeline: {
    types: {
      type: "worker",
      options: {
        worker: path.join(__dirname, "scripts/worker/types.js"),
      },
      dependsOn: ["^types"],
    },
    transpile: {
      type: "worker",
      options: {
        maxWorkers: 4,
        worker: path.join(__dirname, "scripts/worker/transpile.js"),
      }
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
    start: [],
    "@lage-run/e2e-tests#test": {
      type: "npmScript",
      dependsOn: ["build"],
    },
    "lage#test": {
      type: "npmScript",
      dependsOn: ["build"],
    },
    "@lage-run/lage#bundle": {
      type: "npmScript",
      dependsOn: ["^^transpile", "types"]
    },
    "@lage-run/hasher#test": {
      type: "npmScript",
      dependsOn: ["build"],
      options: {
        taskArgs: ["--runInBand"],
      },
    },
    "@lage-run/docs#test": {
      type: "npmScript",
    },
    "@lage-run/docs#build": {
      type: "npmScript",
    },
  },
  npmClient: "yarn",
  cacheOptions: {
    environmentGlob: ["*.js", "*.json", ".github/**", "packages/tsconfig.lage2.json", "patches"],
  },
};
