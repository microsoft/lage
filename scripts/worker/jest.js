/** @import { TargetRunnerOptions } from "@/TargetRunner" */
const { runCLI } = require("jest");

/**
 * @param {TargetRunnerOptions} data
 */
async function jest({ target, weight }) {
  console.log(`Running ${target.id}, maxWorkers: ${weight}`);

  const { results } = await runCLI(
    {
      maxWorkers: weight,
      rootDir: target.cwd,
      passWithNoTests: true,
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
