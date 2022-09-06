// @ts-check
const path = require("path");

/** @type {import("@lage-run/cli").ConfigOptions} */
module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
    lint: {
      type: "worker",
      options: {
        maxWorkers: 4,
        worker: path.join(__dirname, "scripts/worker/lint.js"),
      },
    },
    start: [],

    // TODO: a temporary hack to allow both of these projects to run build with lage
    "@lage-run/docs-beta#build": ["@lage/docs#build"],
  },
  npmClient: "yarn",
};
