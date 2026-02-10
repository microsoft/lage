const path = require("path");
const { getPackageInfo } = require("workspace-tools");
const lintWorker = require("../worker/lint");

(async function main() {
  const packageInfo = getPackageInfo(process.cwd());
  if (!packageInfo) {
    throw new Error(`Could not find package root from ${process.cwd()}`);
  }

  return lintWorker({
    target: { packageName: packageInfo.name, cwd: path.dirname(packageInfo.packageJsonPath) },
    taskArgs: process.argv.slice(2),
  });
})().catch((error) => {
  process.exitCode = 1;
  console.error(error);
});
