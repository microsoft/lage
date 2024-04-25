const { getWorkspaceRoot } = require("workspace-tools");
const root = getWorkspaceRoot(process.cwd());
const path = require("path");

const depcheck = require("depcheck");

const ignoredPackages = ["@lage-run/monorepo-scripts", "@lage-run/docs"];
/** @type {Record<string, { dependencies?: string[]; devDependencies?: string[] }>} */
const ignoreUnused = {
  // used in ways that aren't detected
  lage: { dependencies: ["glob-hasher"], devDependencies: ["@lage-run/scheduler"] },
};

module.exports = async function depcheckWorker({ target: { packageName, cwd } }) {
  if (ignoredPackages.includes(packageName)) {
    return;
  }

  const results = await depcheck(cwd, {
    ignoreBinPackage: true,
    ignorePatterns: ["node_modules", "dist", "lib", "build"],
  });

  let hasErrors = false;
  let formattedError = `Depcheck errors detected in ${packageName}\n\n`;

  const unusedDeps = results.dependencies.filter((dep) => !ignoreUnused[packageName]?.dependencies?.includes(dep));
  if (unusedDeps.length > 0) {
    hasErrors = true;
    formattedError += `Unused dependency: \n`;
    for (const dep of unusedDeps) {
      formattedError += `  ${dep}\n`;
    }
  }

  const unusedDevDeps = results.devDependencies.filter((dep) => !ignoreUnused[packageName]?.devDependencies?.includes(dep));
  if (unusedDevDeps.length > 0) {
    hasErrors = true;
    formattedError += `Unused devDependency: \n`;
    for (const dep of unusedDevDeps) {
      formattedError += `  ${dep}\n`;
    }
  }

  if (Object.keys(results.missing).length > 0) {
    hasErrors = true;
    formattedError += `Missing dependency: \n`;
    for (const [key, value] of Object.entries(results.missing)) {
      formattedError += `  ${key} is used by: ${value.map((file) => path.relative(root, file)).join(", ")}\n`;
    }
  }

  if (hasErrors) {
    throw new Error(formattedError);
  }
};
