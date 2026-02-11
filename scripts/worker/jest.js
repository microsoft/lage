/** @import { WorkerRunnerFunction } from "../types.js" */
const fs = require("fs");
const { runCLI } = require("jest");
const path = require("path");

/**
 * This worker is used for `lage run test`, in place of the per-package `test` script.
 *
 * Note that if running `test` for an individual package, it will use that package's `test` script instead
 * (typically `yarn run -T jest`).
 *
 * @type {WorkerRunnerFunction}
 */
async function jest({ target, weight }) {
  if (!fs.existsSync(path.join(target.cwd, "jest.config.js"))) {
    console.log("No jest.config.js found - skipping");
    return;
  }

  console.log(`Running ${target.id}, maxWorkers: ${weight}`);

  const { results } = await runCLI(
    {
      // Instead of adding more options here, prefer adding them to jest.config.js unless they're truly
      // specific to running in this lage worker context.
      maxWorkers: weight,
      rootDir: target.cwd,
      verbose: true,
      _: [],
      $0: "",
    },
    [target.cwd]
  );

  if (results.success) {
    console.log("Tests passed");
  } else {
    throw new Error("Test failed");
  }
}

module.exports = jest;
