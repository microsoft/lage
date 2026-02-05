const path = require("path");
const transpileWorker = require("../worker/transpile");
const { getPackageInfo } = require("workspace-tools");

(async function main() {
  const packageJson = getPackageInfo(process.cwd());
  if (!packageJson) {
    throw new Error("Could not find package root from " + process.cwd());
  }
  const packageRoot = path.dirname(packageJson.packageJsonPath);

  await transpileWorker({
    target: { packageName: packageJson.name, cwd: packageRoot },
  });
})().catch((error) => {
  process.exitCode = 1;
  console.error(error);
});
