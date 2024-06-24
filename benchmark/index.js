import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { getWorkspaceRoot, getPackageInfos } from "workspace-tools";

// strategies
import fg from "fast-glob";
import globby from "globby";
import { glob } from "glob-hasher";
import { execa } from "execa";
import multimatch from "multimatch";
import micromatch from "micromatch";
import { diffArrays } from "diff";

// Setup
console.time("getting workspace info");
const args = process.argv.slice(2);
const cwd = getWorkspaceRoot(args[0] ?? process.cwd());
const packageInfos = getPackageInfos(cwd);
console.timeEnd("getting workspace info");

const lageConfig = import.meta.resolve(path.join("file://", cwd, "lage.config.js"));

console.log("Checking your lage.config.js inclusion time");

console.time("lage.config.js inclusion time");
const lageConfigModule = await import(lageConfig);
console.timeEnd("lage.config.js inclusion time");

const config = await lageConfigModule.default;

const envGlob = config.cacheOptions.environmentGlob;

// Now try out all the different algorithms
// 0. results
const results = {};

for (const [key, value] of Object.entries(packageInfos).filter(([key]) => key === "@msteams/utilities-test-glassjar")) {
  const packagePath = path.dirname(value.packageJsonPath);
  console.log(value.name);
  results[key] = await bench(() => globby(["**/*"], { cwd: packagePath, gitignore: true, ignore: [".git"] }));
}

async function bench(fn) {
  const start = process.hrtime.bigint();
  const result = await fn();
  const returnVal = {
    files: result.sort(),
    time: process.hrtime.bigint() - start,
  };
  console.log(returnVal.files?.length, Number(returnVal.time) / 1e6);

  return returnVal;
}
