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
      outputs: ["lib/**/*.d.ts"]
    },
    transpile: {
      type: "worker",
      options: {
        worker: path.join(__dirname, "scripts/worker/transpile.js"),
      },
      outputs: ["lib/**/*.js"]
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
      dependsOn: ["build", "^^transpile", "@lage-run/lage#bundle"],
    },
    "lage#test": {
      type: "npmScript",
      dependsOn: ["build", "transpile"],
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
    environmentGlob: ["beachball.config.js", "lage.config.js", "package.json", "renovate.json5", ".github/**", "packages/tsconfig.lage2.json", "patches"],
  },
};
