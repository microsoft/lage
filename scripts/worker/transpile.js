/** @import { BasicWorkerRunnerFunction } from "../types.js" */
const fs = require("fs");
const path = require("path");
const fsPromises = require("fs/promises");
const swc = require("@swc/core");
const { findProjectRoot } = require("workspace-tools");

const root = findProjectRoot(process.cwd());

/**
 * This worker is used for `lage run transpile`, in place of the per-package `transpile` script
 * (except for `@lage-run/globby`, which per lage.config.js uses its custom `transpile` script).
 *
 * Since this worker function has some extra logic to use swc, it's reused by the per-package `transpile` script
 * (`monorepo-scripts transpile` which runs commands/transpile.js) to avoid duplication.
 *
 * @type {BasicWorkerRunnerFunction}
 */
async function transpile({ target }) {
  if (target.packageName?.includes("docs")) {
    return;
  }

  // Start from the src directory to avoid unnecessary transpilation of scripts etc
  const srcDir = path.join(target.cwd, "src");
  if (!fs.existsSync(srcDir)) {
    console.log("No src directory found - skipping");
    return;
  }

  const queue = [srcDir];

  while (queue.length > 0) {
    const dir = /** @type {string} */ (queue.shift());

    let entries = await fsPromises.readdir(dir, { withFileTypes: true });

    for (let entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith("__")) {
        queue.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        // ^ TOOD: this will be broken if there are .js files that need to go to lib, or .mts files (fix if needed in future)
        // Only replace src to 'lib' in the project tree.
        // The repo could be cloned in a folder with 'src' and we don't want to replace that with 'lib'
        const targetRelativePath = path
          .relative(target.cwd, fullPath)
          .replace("src" + path.sep, "lib" + path.sep)
          .replace(".ts", ".js");
        const dest = path.join(target.cwd, targetRelativePath);
        const swcOutput = await swc.transformFile(fullPath, {
          configFile: path.join(root, ".swcrc"),
          sourceFileName: path.relative(path.dirname(dest), fullPath).replace(/\\/g, "/"),
        });

        const destMap = dest + ".map";
        await fsPromises.mkdir(path.dirname(dest), { recursive: true });
        await fsPromises.writeFile(dest, swcOutput.code);

        if (swcOutput.map) {
          await fsPromises.writeFile(destMap, swcOutput.map);
        }
      }
    }
  }
}

module.exports = transpile;
