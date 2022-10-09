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
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        const swcOutput = await swc.transformFile(fullPath);
        const dest = fullPath.replace("/src", "/lib").replace(".ts", ".js");

        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.writeFile(dest, swcOutput.code);
      }
    }
  }

  // swc.transformFile(target.cwd + "/src/index.ts", {});
  // swc
  //   .transform("source code", {
  //     // Some options cannot be specified in .swcrc
  //     filename: "input.js",
  //     sourceMaps: true,
  //     // Input files are treated as module by default.
  //     isModule: false,

  //     // All options below can be configured via .swcrc
  //     jsc: {
  //       parser: {
  //         syntax: "ecmascript",
  //       },
  //       transform: {},
  //     },
  //   })
  //   .then((output) => {
  //     output.code; // transformed code
  //     output.map; // source map (in string)
  //   });
};
