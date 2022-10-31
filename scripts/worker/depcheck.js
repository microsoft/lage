const depcheck = require("depcheck");

module.exports = async function depcheckWorker({ target }) {
  const results = await depcheck(target.cwd, {
    ignoreBinPackage: true,
    ignorePatterns: ["node_modules", "dist", "lib", "build"],
  });

  let hasErrors = false;
  let formattedError = `Depcheck errors detected in ${target.packageName}\n\n`;

  if (results.dependencies.length > 0) {
    hasErrors = true;
    formattedError += `Unused dependency: \n`;
    for (const dep of results.dependencies) {
      formattedError += `  ${dep}\n`;
    }
  }

  if (results.devDependencies.length > 0) {
    hasErrors = true;
    formattedError += `Unused dependency: \n`;
    for (const dep of results.devDependencies) {
      formattedError += `  ${dep}\n`;
    }
  }

  if (Object.keys(results.missing).length > 0) {
    hasErrors = true;
    formattedError += `Missing dependency: \n`;
    for (const [key, value] of Object.entries(results.missing)) {
      formattedError += `  ${key} is used by: ${value.join(", ")}\n`;
    }
  }

  if (hasErrors) {
    throw new Error(formattedError);
  }
};
