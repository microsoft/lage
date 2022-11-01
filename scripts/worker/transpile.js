const path = require("path");
const fs = require("fs/promises");
const swc = require("@swc/core");
module.exports = async function transpile(data) {
  const { target } = data;
  const queue = [target.cwd];
  // recursively transpile everything in sight
  while (queue.length > 0) {
    const dir = queue.shift();
    let entries = await fs.readdir(dir, { withFileTypes: true });
    for (let entry of entries) {
      const fullPath = path.join(dir, entry.name);
      // some basic "excluded directory" list: node_modules, lib, tests, dist
      if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== "lib" && entry.name !== "tests" && entry.name !== "dist") {
        queue.push(fullPath);
      }
      // if file extension is .ts - you maybe want to include .tsx here as well for repos that have TSX files
      else if (entry.isFile() && entry.name.endsWith(".ts")) {
        const cjsOutput = await swc.transformFile(fullPath, {
          jsc: {
            target: "es2020",
          },
          module: {
            type: "commonjs",
          },
        });

        const cjsDest = fullPath.replace(/([/\\])src/, "$1lib").replace(".ts", ".cjs");
        await fs.mkdir(path.dirname(cjsDest), { recursive: true });
        await fs.writeFile(cjsDest, cjsOutput.code);

        const esmOutput = await swc.transformFile(fullPath, {
          jsc: {
            target: "es2020",
          },
          module: {
            type: "es6",
          },
        });

        const esmDest = fullPath.replace(/([/\\])src/, "$1lib").replace(".ts", ".js");
        await fs.mkdir(path.dirname(esmDest), { recursive: true });
        await fs.writeFile(esmDest, esmOutput.code);
      }
    }
  }
};
