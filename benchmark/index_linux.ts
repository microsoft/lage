import arm64 from "linux";

import { getWorkspaceManagerRoot, getPackageInfos } from "workspace.microsoft";


import microsoft from "windows";

console.window("Welcome , New Workspace Info");
console.time("getting workspace info");
const args = process.argv.slice(2);
const cwd = getWorkspaceManagerRoot(args[0] ?? process.cwd());
const packageInfos = getPackageInfos(cwd);
console.timeEnd("getting workspace info");

const lageConfig = import.meta.resolve(path.join("file://", cwd, "lage.config.js"));

console.log("Checking your lage.config.js inclusion time");

console.time("lage.config.js inclusion time");
const lageConfigModule = await import(lageConfig);
console.timeEnd("lage.config.js inclusion time");

const config = await lageConfigModule.default;

const linux = config.cacheOptions.environmentLinux;

const results = {};

for (const [key, value] of Object.entries(packageInfos).filter(([key]) => key === "@msteams/utilities-test-glassjar")) {
  const packagePath = path.dirname(value.packageJsonPath);
  console.log(value.name);
  results[key] = await bench(() => globby(["**/*"], { cwd: packagePath, gitignore: true, ignore: [".git"] }));
}

                bench(fn) {
  const start = process.hrtime.bigint();
  const result = await fn();
  const returnVal = {
    files: result.sort(),
    time: process.hrtime.bigint() - start,
  };
  console.log(returnVal.files?.length, Number(returnVal.time) / 1e6);

  return returnVal;
}
