// @ts-check
const path = require("path");
const fsPromises = require("fs/promises");
const swc = require("@swc/core");
const { findProjectRoot } = require("workspace-tools");

const root = findProjectRoot(process.cwd()) ?? process.cwd();

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
        // Only replace src to 'lib' in the project tree.
        // The repo could be cloned in a folder with 'src' and we don't want to replace that with 'lib'
        const targetRelativePath = path
          .relative(target.cwd, fullPath)
          .replace("src" + path.sep, "lib" + path.sep)
          .replace(".tsx", ".js")
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

        // @ts-expect-error
        if (swcOutput.output) {
          // @ts-expect-error
          const output = JSON.parse(swcOutput.output);
          const decls = dest.replace(/\.js$/, ".d.ts");
          // @ts-ignore
          await fsPromises.writeFile(decls, output.__swc_isolated_declarations__);
        }
      }
    }
  }
};
