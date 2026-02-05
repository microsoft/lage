const { run: runJest } = require("jest");
const path = require("path");
const { findPackageRoot } = require("workspace-tools");

const args = process.argv.slice(2);

function start() {
  const packagePath = findPackageRoot(process.cwd());
  if (!packagePath) {
    throw new Error("Could not find package.json relative to " + process.cwd());
  }

  console.log(`Starting Jest debugging at: ${packagePath}`);

  return runJest([
    "--config",
    path.join(packagePath, "jest.config.js"),
    "--rootDir",
    packagePath,
    "--runInBand",
    "--testTimeout=999999999",
    ...args,
  ]);
}

start().catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});
