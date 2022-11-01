// @ts-check
const path = require("path");
const fastGlob = require("fast-glob");

/** @type {import("@lage-run/cli").ConfigOptions} */
module.exports = {
  pipeline: {
    transpile: {
      type: "worker",
      options: {
        worker: path.join(__dirname, "scripts/worker/transpile.js"),
      },
    },
    types: {
      type: "worker",
      options: {
        worker: path.join(__dirname, "scripts/worker/types.js"),
      },
      dependsOn: ["^types"]
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
      }
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
    "@lage-run/docs#test": {
      type: "npmScript",
    },
    "lage#build": {
      type: "npmScript",
      dependsOn: ["^build"],
    },
    "@lage-run/lage#build": {
      type: "npmScript",
      dependsOn: ["^^transpile"]
    },
    "@lage-run/docs#build": {
      type: "npmScript",
    },
  },
  npmClient: "yarn",
  cacheOptions: {
    environmentGlob: ["*.js", "*.json", ".github/**"],
  },
};
