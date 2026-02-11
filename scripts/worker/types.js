/** @import { WorkerRunnerFunction } from "../types" */
const ts = require("typescript");
const path = require("path");
const { existsSync } = require("fs");

/** @type {ts.Program | undefined} */
let oldProgram;

/**
 * This worker is used for `lage run types`, in place of the per-package `types` script
 * (except for `@lage-run/globby`, which per lage.config.js uses its custom `types` script).
 *
 * Note that if running `types` for an individual package, it will use that package's `types` script instead
 * (typically `yarn run -T tsc`).
 *
 * @type {WorkerRunnerFunction}
 */
async function run(data) {
  const { target, taskArgs } = data;

  const verbose = taskArgs.includes("--verbose");

  const tsconfigFile = "tsconfig.json";
  const tsconfigJsonFile = path.join(target.cwd, tsconfigFile);

  // Find tsconfig.json
  if (!existsSync(tsconfigJsonFile)) {
    console.log("no tsconfig.json found - skipping");
    // pass
    return;
  }

  // Parse tsconfig
  verbose && console.log(`Parsing config...`);
  const parsedCommandLine = ts.getParsedCommandLineOfConfigFile(
    tsconfigJsonFile,
    {},
    {
      fileExists: (f) => ts.sys.fileExists(f),
      readDirectory(root, extensions, excludes, includes, depth) {
        return ts.sys.readDirectory(root, extensions, excludes, includes, depth);
      },
      readFile: (f) => ts.sys.readFile(f),
      useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      onUnRecoverableConfigFileDiagnostic: (d) => {
        throw new Error(ts.flattenDiagnosticMessageText(d.messageText, ""));
      },
    }
  );
  if (!parsedCommandLine) {
    throw new Error("Could not parse tsconfig.json");
  }

  // This should NOT be modified here! Instead, any options updates should be made to tsconfig.base.json
  // so that they're also reflected if used by the per-package `types` script (`yarn run -T tsc`).
  const compilerOptions = parsedCommandLine.options;

  // Creating compilation host program
  verbose && console.log(`Creating host compiler...`);
  const compilerHost = ts.createCompilerHost(compilerOptions);

  const program = ts.createProgram(parsedCommandLine.fileNames, compilerOptions, compilerHost, oldProgram);
  oldProgram = program;

  const errors = {
    semantics: program.getSemanticDiagnostics(),
    declaration: program.getDeclarationDiagnostics(),
    syntactic: program.getSyntacticDiagnostics(),
    global: program.getGlobalDiagnostics(),
  };

  const allErrors = [];

  console.log(`Compiling...`);
  try {
    program.emit();
  } catch (e) {
    console.error(`Encountered error while transpiling: ${/** @type {ts.Diagnostic} */ (e).messageText}`);
    throw new Error("Encountered error while transpiling");
  }
  let hasErrors = false;

  for (const kind of /** @type {(keyof typeof errors)[]} */ (Object.keys(errors))) {
    for (const diagnostics of errors[kind]) {
      hasErrors = true;
      allErrors.push(diagnostics);
    }
  }

  if (hasErrors) {
    console.error(`Type errors found in ${target.packageName}`);
    console.error(ts.formatDiagnosticsWithColorAndContext(allErrors, compilerHost));

    throw new Error("Failed to compile");
  } else {
    console.log("Compiled successfully");

    return;
  }
}

module.exports = run;
