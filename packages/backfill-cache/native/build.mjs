// @ts-check
import { spawnSync } from "child_process";
import { createHash, randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const nativeDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(nativeDir, "../lib/native");
const filename = `cache-validator-${process.platform}-${process.arch}.node`;
const outputFile = path.join(outputDir, filename);
const targetDir = path.join(nativeDir, "target");
const stampFile = path.join(targetDir, `${filename}.json`);
const cargo = process.env.CARGO || "cargo";
const rustc = process.env.RUSTC || "rustc";

/** @param {string} file */
function fileHash(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

/** @param {string} destination @param {(staging: string) => void} write */
function publishAtomically(destination, write) {
  const directory = path.resolve(path.dirname(destination));
  fs.mkdirSync(directory, { recursive: true });
  const staging = path.join(
    directory,
    `.${path.basename(destination)}.${process.pid}.${randomBytes(8).toString("hex")}${path.extname(destination)}`
  );
  // Exclusive creation means a collision cannot overwrite or clean up another writer's file.
  let created = false;
  try {
    const descriptor = fs.openSync(staging, "wx");
    created = true;
    fs.closeSync(descriptor);
    write(staging);
    try {
      fs.renameSync(staging, destination);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Cannot atomically replace ${path.basename(destination)}. Close processes using the existing file and retry; ` +
          `the existing file was not removed. ${message}`
      );
    }
    created = false;
  } finally {
    if (created) {
      fs.rmSync(staging, { force: true });
    }
  }
}

/** @param {string} source @param {string} destination @returns {string} */
export function publishNativeBinary(source, destination) {
  const binary = fileHash(source);
  publishAtomically(destination, (staging) => {
    fs.copyFileSync(source, staging);
    if (fileHash(staging) !== binary) {
      throw new Error(
        "Native binary changed while copying; no replacement was published."
      );
    }
    // Validate in a child so Windows releases its DLL handle before the rename.
    const result = spawnSync(
      process.execPath,
      [
        "-e",
        `
const native = require(process.argv[1]);
if (native.apiVersion !== 1 || typeof native.validateOutputs !== "function") {
  throw new Error("Unsupported native validator ABI");
}
const result = native.validateOutputs(process.cwd(), [], []);
if (!(result instanceof Promise)) throw new Error("validateOutputs must return a Promise");
result.then((valid) => {
  if (valid !== true) throw new Error("Empty native validation failed");
  process.stdout.write("native-api-v1");
}).catch((error) => { console.error(error); process.exitCode = 1; });
`,
        staging,
      ],
      { encoding: "utf8", timeout: 30000 }
    );
    if (
      result.error ||
      result.status !== 0 ||
      result.stdout !== "native-api-v1"
    ) {
      throw new Error(
        `Native validator ABI verification failed; no replacement was published. ` +
          (result.error?.message ||
            result.stderr?.trim() ||
            "The ABI check did not complete.")
      );
    }
  });
  return binary;
}

function inputHash() {
  const hash = createHash("sha256").update(
    `${process.platform}\0${process.arch}\0`
  );
  const files = ["Cargo.toml", "Cargo.lock", "build.rs", "build.mjs"];
  const directories = ["src"];
  for (const directory of directories) {
    const fullPath = path.join(nativeDir, directory);
    if (!fs.existsSync(fullPath)) {
      continue;
    }
    for (const entry of fs.readdirSync(fullPath, { withFileTypes: true })) {
      const relativePath = path.join(directory, entry.name);
      (entry.isDirectory() ? directories : files).push(relativePath);
    }
  }
  for (const file of files.sort()) {
    const fullPath = path.join(nativeDir, file);
    hash
      .update(file)
      .update("\0")
      .update(fs.existsSync(fullPath) ? fileHash(fullPath) : "missing");
  }
  return hash.digest("hex");
}

/** @param {string} inputs */
function isCurrent(inputs) {
  try {
    const stamp = JSON.parse(fs.readFileSync(stampFile, "utf8"));
    return stamp.inputs === inputs && stamp.binary === fileHash(outputFile);
  } catch {
    // Missing, malformed, or unreadable stamps cannot authorize reuse.
    return false;
  }
}

function clearArtifacts(preserveCurrent = false) {
  if (fs.existsSync(outputDir)) {
    for (const file of fs.readdirSync(outputDir)) {
      if (
        file.startsWith("cache-validator-") &&
        file.endsWith(".node") &&
        !(preserveCurrent && file === filename)
      ) {
        fs.unlinkSync(path.join(outputDir, file));
      }
    }
  }
  if (!preserveCurrent && fs.existsSync(stampFile)) {
    fs.unlinkSync(stampFile);
  }
}

/** @param {boolean} current */
function reportSkipped(current) {
  // Missing tools may reuse only a verified, current artifact.
  clearArtifacts(current);
  if (current) {
    console.warn(
      `[backfill-cache:native] Reusing ${filename}: its build inputs and binary are unchanged. No native build was run.`
    );
  } else {
    console.warn(
      "[backfill-cache:native] No native validator was built; using the portable JavaScript fallback. " +
        "Install Rust or set CARGO and RUSTC, then rerun yarn native:build."
    );
  }
}

/** @param {string} executable @param {string[]} args */
function probe(executable, args) {
  const result = spawnSync(executable, args, {
    cwd: nativeDir,
    encoding: "utf8",
  });
  const error = /** @type {NodeJS.ErrnoException | undefined} */ (result.error);
  if (error && error.code !== "ENOENT") {
    throw error;
  }
  if (error || result.status !== 0) {
    console.warn(
      `[backfill-cache:native] Rust toolchain unavailable (${executable}).`
    );
    console.warn(
      error?.message ||
        result.stderr.trim() ||
        `Toolchain probe exited with status ${result.status}.`
    );
    return undefined;
  }
  return result.stdout;
}

function build() {
  const inputs = inputHash();
  const current = isCurrent(inputs);

  if (probe(cargo, ["--version"]) === undefined) {
    reportSkipped(current);
    return;
  }
  const compiler = probe(rustc, ["--version", "--verbose"]);
  if (compiler === undefined) {
    reportSkipped(current);
    return;
  }
  const host = /^host: (\S+)$/m.exec(compiler)?.[1];
  if (!host) {
    throw new Error(
      "rustc did not report its host target; no native validator was built."
    );
  }
  const hostArch = host.split("-")[0];
  const architectureAliases = /** @type {Record<string, string>} */ ({
    x86_64: "x64",
    aarch64: "arm64",
    i586: "ia32",
    i686: "ia32",
    powerpc64: "ppc64",
    powerpc64le: "ppc64",
    riscv64gc: "riscv64",
  });
  const nodeArch = hostArch.startsWith("arm")
    ? "arm"
    : (architectureAliases[hostArch] ?? hostArch);
  const platform =
    process.platform === "win32"
      ? "windows"
      : process.platform === "sunos"
        ? "solaris"
        : process.platform;
  if (nodeArch !== process.arch || !host.includes(`-${platform}`)) {
    console.warn(
      `[backfill-cache:native] Rust host ${host} does not match Node.js ${process.platform}-${process.arch}.`
    );
    reportSkipped(current);
    return;
  }

  const result = spawnSync(
    cargo,
    [
      "build",
      "--release",
      "--locked",
      "--lib",
      "--target",
      host,
      "--target-dir",
      targetDir,
    ],
    {
      cwd: nativeDir,
      stdio: "inherit",
    }
  );
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    console.error(
      "[backfill-cache:native] Cargo build failed; no native validator was published."
    );
    process.exitCode = result.status || 1;
    return;
  }
  if (inputHash() !== inputs) {
    throw new Error(
      "Native build inputs changed during compilation; rerun yarn native:build."
    );
  }

  const library =
    process.platform === "win32"
      ? "lage_cache_validator.dll"
      : process.platform === "darwin"
        ? "liblage_cache_validator.dylib"
        : "liblage_cache_validator.so";
  const binary = publishNativeBinary(
    path.join(targetDir, host, "release", library),
    outputFile
  );
  publishAtomically(stampFile, (staging) => {
    fs.writeFileSync(staging, JSON.stringify({ inputs, binary }) + "\n");
  });
  clearArtifacts(true);
  console.log(`[backfill-cache:native] Built lib/native/${filename}`);
}

if (
  process.argv[1] &&
  path.relative(
    path.resolve(process.argv[1]),
    fileURLToPath(import.meta.url)
  ) === ""
) {
  build();
}
