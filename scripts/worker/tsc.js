// @ts-check

const { registerWorker } = require("../../../lage/packages/worker-threads-pool/lib/index.js");

const ts = require("typescript");
const path = require("path");
const fs = require("fs/promises");

let oldProgram = undefined;

async function run(data) {
  const { target } = data;
  const tsconfigJsonFile = path.join(target.cwd, "tsconfig.json");

  if (!tsconfigJsonFile) {
    process.stdout.write(`No tsconfig.json in ${target.cwd}\n`);
    // pass
    return;
  }
  
  const configJson = JSON.parse(await fs.readFile(path.join(target.cwd, "tsconfig.json"), "utf-8"));
  const compilerOptionsResults = ts.convertCompilerOptionsFromJson(configJson, path.join(target.cwd, "tsconfig.json"));

  if (compilerOptionsResults.errors.length > 0) {
    process.stderr.write(`Error parsing tsconfig.json in ${target.cwd}\n`);
    throw new Error("Error parsing tsconfig.json");
  }

  const compilerOptions = compilerOptionsResults.options;
  let compilerHost = ts.createCompilerHost(compilerOptions);

  let program = ts.createProgram([path.join(target.cwd, "src", "index.ts")], compilerOptions, compilerHost, oldProgram);
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
