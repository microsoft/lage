/** @import { Target } from "@/TargetGraph" */
const fs = require("fs");
const path = require("path");
const fsPromises = require("fs/promises");
const swc = require("@swc/core");
const { findProjectRoot } = require("workspace-tools");

const root = findProjectRoot(process.cwd());

/**
 * The type here should be `WorkerRunnerOptions & TargetRunnerOptions`, but we only specify the
 * needed properties so the runner function can be reused by commands/transpile.js.
 * @param {{ target: Pick<Target, 'packageName' | 'cwd'> }} data
 */
async function transpile({ target }) {
  if (target.packageName?.includes("docs")) {
    return;
  }

  // Start from the src directory to avoid unnecessary transpilation of scripts etc
  const srcDir = path.join(target.cwd, "src");
  if (!fs.existsSync(srcDir)) {
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
