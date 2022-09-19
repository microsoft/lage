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
      dependsOn: ["@lage-run/worker-threads-pool#build"],
    },
    start: [],
  },
  npmClient: "yarn",
};
