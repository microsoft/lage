/** @import { TargetRunner, TargetRunnerOptions } from "@lage-run/runners" */

/** @implements {TargetRunner} */
class FailOnPackageRunner {
  constructor(/** @type {string} */ packageName) {
    this.failPackage = packageName;
  }

  async shouldRun() {
    return true;
  }

  /** @returns {Promise<void>} */
  run(/** @type {TargetRunnerOptions} */ { target, abortSignal }) {
    return new Promise((resolve, reject) => {
      if (target.packageName === this.failPackage) {
        reject(new Error("oops"));
      }

      const timeout = setTimeout(() => {
        resolve();
      }, 50);

      abortSignal?.addEventListener("abort", () => {
        timeout?.unref();
        reject(new Error("aborted"));
      });
    });
  }
}

module.exports.FailOnPackageRunner = FailOnPackageRunner;
