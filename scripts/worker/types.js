/** @import { Target } from "@/TargetGraph" */
const ts = require("typescript");
const path = require("path");
const { existsSync } = require("fs");

/** @type {ts.Program | undefined} */
let oldProgram;

const log = (/** @type {*} */ msg) => {
  process.stdout.write(String(msg) + "\n");
};

/**
 * The type here should be `WorkerRunnerOptions & TargetRunnerOptions`, but we only specify the
 * needed properties so the runner function can be reused by commands/types.js.
 * @param {{ target: Pick<Target, 'packageName' | 'cwd'> }} data
 */
async function run(data) {
  const { target } = data;

  const tsconfigFile = "tsconfig.json";
  const tsconfigJsonFile = path.join(target.cwd, tsconfigFile);

  // Find tsconfig.json
  if (!existsSync(tsconfigJsonFile)) {
    log("no tsconfig.json found - skipping this package");
    // pass
    return;
  }

  // Parse tsconfig
  log(`Parsing config...`);
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

  const compilerOptions = parsedCommandLine.options;

  // Creating compilation host program
  log(`Creating host compiler...`);
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

  log(`Compiling...`);
  try {
    program.emit();
  } catch (e) {
    log(`Encountered error while transpiling: ${/** @type {ts.Diagnostic} */ (e).messageText}`);
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
    log(`Type errors found in ${target.packageName}`);
    log(ts.formatDiagnosticsWithColorAndContext(allErrors, compilerHost));

    throw new Error("Failed to compile");
  } else {
    log("Compiled successfully");

    return;
  }
}

module.exports = run;
