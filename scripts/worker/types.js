// @ts-check
const ts = require("typescript");
const path = require("path");
const { existsSync } = require("fs");

let oldProgram;

const log = (msg) => {
  process.stdout.write(msg + "\n");
};

/**
 * Worker Run() function
 * @param {*} data Lage Context
 */
async function run(data) {
  const { target } = data; // Lage target data

  const tsconfigFile = "tsconfig.json";
  const tsconfigJsonFile = path.join(target.cwd, tsconfigFile);

  // Find tsconfig.json
  if (!existsSync(tsconfigJsonFile)) {
    log("no tsconfig.json found - skipping this package");
    // pass
    return;
  }

  // Parse tsconfig
  log(`Parsing Config...`);
  const configParserHost = parseConfigHostFromCompilerHostLike(ts.sys);
  const parsedCommandLine = ts.getParsedCommandLineOfConfigFile(tsconfigJsonFile, {}, configParserHost);
  if (!parsedCommandLine) {
    throw new Error("Could not parse tsconfig.json");
  }

  const compilerOptions = parsedCommandLine.options;

  // Creating compilation host program
  log(`Creating Host Compiler...`);
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
    log(`Encountered Error while transpiling: ${e.messageText}`);
    throw new Error("Encountered Error while transpiling");
  }
  let hasErrors = false;

  for (const kind of Object.keys(errors)) {
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

function parseConfigHostFromCompilerHostLike(host) {
  return {
    fileExists: (f) => host.fileExists(f),
    readDirectory(root, extensions, excludes, includes, depth) {
      return host.readDirectory(root, extensions, excludes, includes, depth);
    },
    readFile: (f) => host.readFile(f),
    useCaseSensitiveFileNames: host.useCaseSensitiveFileNames,
    getCurrentDirectory: host.getCurrentDirectory,
    onUnRecoverableConfigFileDiagnostic: (d) => {
      throw new Error(ts.flattenDiagnosticMessageText(d.messageText, ""));
    },
    trace: host.trace,
  };
}

module.exports = run;
