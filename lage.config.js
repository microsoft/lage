// @ts-check
const path = require("path");
const fastGlob = require("fast-glob");

/** @type {import("@lage-run/cli").ConfigOptions} */
module.exports = {
  pipeline: {
    build: ["^build"],
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
  },
  npmClient: "yarn",
  cacheOptions: {
    environmentGlob: ["*.js", "*.json", ".github/**", "packages/tsconfig.lage2.json", "patches"],
  },
};
