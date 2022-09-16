// @ts-check

const { registerWorker } = require("../../../lage/packages/worker-threads-pool/lib/index.js");

const ts = require("typescript");
const path = require("path");
const fs = require("fs/promises");
const { existsSync } = require("fs");

let oldProgram = undefined;

async function run(data) {
  const { target } = data;
  const { tsconfigFile = "tsconfig.json" } = target.options;
  const tsconfigJsonFile = path.join(target.cwd, tsconfigFile);

  if (!existsSync(tsconfigJsonFile)) {
    process.stdout.write(`No tsconfig.json in ${target.cwd}\n`);
    // pass
    return;
  }

  let configParserHost = parseConfigHostFromCompilerHostLike(ts.sys);

  let parsedCommandLine = ts.getParsedCommandLineOfConfigFile(tsconfigJsonFile, {}, configParserHost);

  if (!parsedCommandLine) {
    throw new Error("Could not parse tsconfig.json");
  }

  const compilerOptions = parsedCommandLine.options;

  let compilerHost = ts.createCompilerHost(compilerOptions);

  let program = ts.createProgram(parsedCommandLine.fileNames, compilerOptions, compilerHost, oldProgram);
  oldProgram = program;

  let errors = {
    semantics: program.getSemanticDiagnostics(),
    declaration: program.getDeclarationDiagnostics(),
    syntactic: program.getSyntacticDiagnostics(),
    global: program.getGlobalDiagnostics(),
  };

  let allErrors = [];

  process.stdout.write("Compiling...\n");
  program.emit();

  let hasErrors = false;

  for (const kind of Object.keys(errors)) {
    for (const diagnostics of errors[kind]) {
      hasErrors = true;

      allErrors.push(diagnostics);
      if (typeof diagnostics.messageText === "string") {
        process.stdout.write(diagnostics.messageText);
      } else {
        process.stdout.write(diagnostics.messageText.messageText);
      }
    }
  }

  if (hasErrors) {
    process.stderr.write(ts.formatDiagnosticsWithColorAndContext(allErrors, compilerHost));
    throw new Error("Failed to compile");
  } else {
    process.stdout.write("Compiled successfully\n");
  }
}

registerWorker(run);

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
      throw new Error(ts.flattenDiagnosticMessageText(d.messageText, "\n"));
    },
    trace: host.trace,
  };
}
