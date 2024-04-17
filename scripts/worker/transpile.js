const path = require("path");
const fs = require("fs/promises");
const swc = require("@swc/core");

module.exports = async function transpile(data) {
  const { target } = data;

  if (target.packageName.includes("docs")) {
    return;
  }

  const queue = [target.cwd];

  while (queue.length > 0) {
    const dir = queue.shift();

    let entries = await fs.readdir(dir, { withFileTypes: true });

    for (let entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== "lib" && entry.name !== "tests" && entry.name !== "dist") {
        queue.push(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        const swcOutput = await swc.transformFile(fullPath, {
          jsc: {
            parser: {
              syntax: "typescript",
              tsx: false,
              dynamicImport: true,
            },
            target: "es2020",
          },
          module: {
            type: "commonjs",
            ignoreDynamic: true,
          },
        });
        const dest = fullPath
          .replace(/([/\\])src/, "$1lib")
          .replace(".tsx", ".js")
          .replace(".ts", ".js");
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.writeFile(dest, swcOutput.code);
      }
    }
  }
};
