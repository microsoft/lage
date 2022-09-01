// @ts-check
const path = require("path");

/** @type {import("@lage-run/cli").ConfigOptions} */
module.exports = {
  pipeline: {
    build: ["^build"],
    test: [],
    lint: {
      type: "worker",
      options: {
        maxWorkers: 4,
        worker: path.join(__dirname, "scripts/worker/lint.js"),
      },
    },
    start: [],
    "lage#test": ["build"],
    "@lage-run/e2e-tests#test": ["^build"],

    // TODO: a temporary hack to allow both of these projects to run build with lage
    "@lage-run/docs-beta#build": ["@lage/docs#build"],
  },
  npmClient: "yarn",
};
