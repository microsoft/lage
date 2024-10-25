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
  console.log("queue: " + queue[0]);
  while (queue.length > 0) {
    const dir = queue.shift();

    let entries = await fsPromises.readdir(dir, { withFileTypes: true });

    for (let entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== "lib" && entry.name !== "tests" && entry.name !== "dist") {
        queue.push(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        const swcOutput = await swc.transformFile(fullPath, swcOptions);
        const targetRelativePath = path.relative(target.cwd, fullPath)
          .replace("src" + path.sep, "lib" + path.sep)
          .replace(".tsx", ".js")
          .replace(".ts", ".js");
        const dest = path.join(target.cwd, targetRelativePath);
        console.log(fullPath + " ==> " + dest);
        await fsPromises.mkdir(path.dirname(dest), { recursive: true });
        await fsPromises.writeFile(dest, swcOutput.code);
      }
    }
  }
};
