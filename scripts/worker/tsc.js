// @ts-check

const { registerWorker } = require("@lage-run/worker-threads-pool");
const { readFile } = require("fs/promises");

const ts = require("typescript");
const path = require("path");

let oldProgram = undefined;

async function run(data) {
  const { target } = data;
  const packageJson = JSON.parse(await readFile(path.join(target.cwd, "package.json"), "utf8"));

  if (!packageJson.scripts?.[target.task]) {
    process.stdout.write(`No script found for ${target.task} in ${target.cwd}\n`);
    // pass
    return;
  }
  let compilerOptions = {
    target: ts.ScriptTarget.ES2015,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    outDir: path.join(target.cwd, "lib"),
    rootDir: path.join(target.cwd, "src"),
    skipLibCheck: true,
    skipDefaultLibCheck: true,
  };

  let compilerHost = ts.createCompilerHost(compilerOptions);

  let program = ts.createProgram([path.join(target.cwd, "src", "index.ts")], compilerOptions, compilerHost, oldProgram);
  oldProgram = program;

  process.stdout.write("Compiling...\n");
  let emitResult = program.emit();

  for (const diagnostics of emitResult.diagnostics) {
    if (typeof diagnostics.messageText === "string") {
      process.stdout.write(diagnostics.messageText);
    } else {
      process.stdout.write(diagnostics.messageText.messageText);
    }
  }

  if (emitResult.diagnostics.some((d) => d.category === ts.DiagnosticCategory.Error)) {
    throw new Error("Failed to compile");
  } else {
    process.stdout.write("Compiled successfully\n");
  }
}

registerWorker(run);
