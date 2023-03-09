// @ts-check
const path = require("path");
const fastGlob = require("fast-glob");

/** @type {import("@lage-run/cli/src/types/ConfigOptions").ConfigOptions} */
module.exports = {
  pipeline: {
    "lage#bundle": {
      outputs: ["dist/**"],
      dependsOn: ["^^transpile", "types"]
    },
    types: {
      type: "worker",
      options: {
        worker: path.join(__dirname, "scripts/worker/types.js"),
      },
      dependsOn: ["^types"],
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
      outputs: [],
      dependsOn: ["build"],
    },
    lint: {
      type: "worker",
      outputs: [],
      options: {
        worker: path.join(__dirname, "scripts/worker/lint.js"),
      },
    },
    depcheck: {
      type: "worker",
      outputs: [],
      options: {
        worker: path.join(__dirname, "scripts/worker/depcheck.js"),
      },
    },
    "@lage-run/e2e-tests#test": {
      type: "npmScript",
      outputs: [],
      dependsOn: ["^^transpile", "lage#bundle"],
    },
    "@lage-run/hasher#test": {
      type: "npmScript",
      outputs: [],
      dependsOn: ["transpile"],
    },
  },
  npmClient: "yarn",
  cacheOptions: {
    environmentGlob: [
      "beachball.config.js",
      "lage.config.js",
      "package.json",
      "renovate.json5",
      ".github/**",
      "packages/tsconfig.lage2.json",
      "patches",
    ],
  },
};
