// @ts-check

const { registerWorker } = require("@lage-run/worker-threads-pool");
const { readFile } = require("fs/promises");

const ts = require("typescript");
const path = require("path");

let oldProgram = undefined;

async function run(data) {
  const { target } = data;
  const tsconfigJsonFile = path.join(target.cwd, "tsconfig.json");

  if (!tsconfigJsonFile) {
    process.stdout.write(`No tsconfig.json in ${target.cwd}\n`);
    // pass
    return;
  }
  let compilerOptions = {
    target: ts.ScriptTarget.ES2017,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    outDir: path.join(target.cwd, "dist"),
    rootDir: path.join(target.cwd, "src"),
    skipLibCheck: true,
    skipDefaultLibCheck: true,

    declaration: true,
    lib: ["ES2017"],
    allowJs: true,

    strict: true,
    noImplicitAny: false,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    forceConsistentCasingInFileNames: true,

    noUnusedLocals: false,
    sourceMap: true,
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
