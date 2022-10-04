class AbortEarlyRunner {
  constructor(packageName) {
    this.failPackage = packageName;
  }

  run(target, abortSignal) {
    return new Promise((resolve, reject) => {
      if (target.packageName === this.failPackage) {
        reject(new Error("oops"));
      }

      const timeout = setTimeout(() => {
        resolve();
      }, 50000);

      abortSignal?.addEventListener("abort", () => {
        timeout?.unref();
        reject(new Error("aborted"));
      });
    });
  }
}

module.exports.AbortEarlyRunner = AbortEarlyRunner;
