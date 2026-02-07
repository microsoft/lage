// @ts-check
/** @import { BundlerConfig } from "dts-bundle-generator/config-schema" */
/** @import { TSESTree } from "@typescript-eslint/types" */
const fs = require("fs");
const { isBuiltin } = require("module");
const path = require("path");
const { getPackageInfo } = require("workspace-tools");
const { parse } = require("@typescript-eslint/parser");

/**
 * Get a config for `dts-bundle-generator`, which is basically like Rollup but for types.
 * https://github.com/timocov/dts-bundle-generator/blob/master/src/config-file/README.md
 *
 * Also add a `beforeExit` listener to validate that there are no unexpected imports in the dts bundle.
 * (Currently, all imports except Node builtins are considered unexpected. If a package later needs
 * to externalize more libraries, more options can be added to this function.)
 *
 * @param {object} params
 * @param {string} params.entryFile Path to the entry d.ts file (absolute or relative to package root)
 * @param {string} params.outFile Path to the output bundled d.ts file (absolute or relative to package root)
 * @param {(string | RegExp)[]} params.inlinedLibraries Inline types for these libraries
 * @returns {BundlerConfig}
 */
function getDtsBundleConfig(params) {
  console.log("Generating types bundle...");

  const packageInfo = getPackageInfo(process.cwd());
  if (!packageInfo) {
    throw new Error(`Could not find package root from ${process.cwd()}`);
  }
  const packageRoot = path.dirname(packageInfo.packageJsonPath);

  const entryFile = path.resolve(packageRoot, params.entryFile);
  const outFile = path.resolve(packageRoot, params.outFile);

  // Use "once" because otherwise it will run again after the first run completes
  process.once("beforeExit", async (code) => {
    if (!code) {
      console.log("Verifying no unexpected imports in bundled types");
      await onBeforeExit({ packageName: packageInfo.name, outFile });
    }
  });

  return {
    compilationOptions: {
      preferredConfigPath: path.join(__dirname, "./tsconfig.dts-bundle.json"),
    },
    entries: [
      {
        filePath: entryFile,
        outFile,
        libraries: {
          inlinedLibraries: params.inlinedLibraries,
        },
        output: {
          // Only export the types which are explicitly exported in the original files
          // (rather than all types referenced by exported types)
          exportReferencedTypes: false,
          noBanner: true,
          inlineDeclareGlobals: true,
        },
      },
    ],
  };
}

/**
 * Verify no unexpected imports were introduced in the bundled d.ts file.
 * @param {object} params
 * @param {string} params.packageName Package name being validated
 * @param {string} params.outFile Absolute path to the bundled file
 */
async function onBeforeExit(params) {
  const { packageName, outFile } = params;

  const content = fs.readFileSync(outFile, "utf8");

  // Parse with typescript-eslint since it's already installed
  const parsed = parse(content, { warnOnUnsupportedTypeScriptVersion: false });

  const { walk } = await import("zimmerframe");

  // Scan through the imports to validate they're only referencing builtins.
  // (realistically it would probably be fine to just scan for top-level imports)
  const /** @type {string[]} */ imports = [];
  walk(/** @type {TSESTree.Node} */ (parsed), null, {
    ImportDeclaration(node) {
      imports.push(node.source.value);
    },
    // import('foo')
    ImportExpression(node) {
      node.source.type === "Literal" && typeof node.source.value === "string" && imports.push(node.source.value);
    },
    // typeof import('foo')
    TSImportType(node) {
      node.parameter.type === "TSLiteralType" &&
        node.parameter.literal.type === "Literal" &&
        typeof node.parameter.literal.value === "string" &&
        imports.push(node.parameter.literal.value);
    },
    ExportNamedDeclaration(node) {
      node.source && imports.push(node.source.value);
    },
    ExportAllDeclaration(node) {
      node.source && imports.push(node.source.value);
    },
    // import foo = require('foo')
    TSExternalModuleReference(node) {
      node.expression.type === "Literal" && typeof node.expression.value === "string" && imports.push(node.expression.value);
    },
  });

  const unexpectedImports = imports.filter((i) => !isBuiltin(i));

  if (unexpectedImports.length) {
    console.error(`
Found unexpected new import(s) in the bundled types for ${packageName}:
${unexpectedImports.map((i) => `  ${i}`).join("\n")}
You may need to add the package(s) to the "inlinedLibraries" list in dts-bundle.config.js.
`);
    process.exit(1);
  }
}

module.exports = getDtsBundleConfig;
