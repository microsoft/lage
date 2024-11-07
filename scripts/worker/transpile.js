// @ts-check
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs/promises");
const swc = require("@swc/core");
const { findProjectRoot } = require("workspace-tools");

const root = findProjectRoot(process.cwd()) ?? process.cwd();
const swcOptions = JSON.parse(fs.readFileSync(path.join(root, ".swcrc"), "utf8"));

module.exports = async function transpile(data) {
  const { target } = data;

  if (target.packageName.includes("docs")) {
    return;
  }

  const queue = [target.cwd];

  while (queue.length > 0) {
    const dir = queue.shift();

    let entries = await fsPromises.readdir(dir, { withFileTypes: true });

    for (let entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== "lib" && entry.name !== "tests" && entry.name !== "dist") {
        queue.push(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        const dest = fullPath
          .replace(/([/\\])src/, "$1lib")
          .replace(".tsx", ".js")
          .replace(".ts", ".js");

        const swcOutput = await swc.transformFile(fullPath, { ...swcOptions, sourceFileName: path.relative(path.dirname(dest), fullPath).replace(/\\/g, "/") });

        const destMap = dest + ".map";
        await fsPromises.mkdir(path.dirname(dest), { recursive: true });
        await fsPromises.writeFile(dest, swcOutput.code);

        if (swcOutput.map) {
          await fsPromises.writeFile(destMap, swcOutput.map);
        }
      }
    }
  }
};
