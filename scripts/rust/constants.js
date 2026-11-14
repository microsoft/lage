const assert = require("node:assert/strict");

// Map Rust target triples to NAPI-RS filenames and npm package suffixes.
// Keep this list aligned with the wrapper's NAPI targets, binary packages, and CI matrix.
const nativeTargets = [
  { triple: "x86_64-apple-darwin", suffix: "darwin-x64" },
  { triple: "aarch64-apple-darwin", suffix: "darwin-arm64" },
  { triple: "x86_64-unknown-linux-gnu", suffix: "linux-x64-gnu" },
  { triple: "aarch64-unknown-linux-gnu", suffix: "linux-arm64-gnu" },
  { triple: "x86_64-unknown-linux-musl", suffix: "linux-x64-musl" },
  { triple: "x86_64-pc-windows-msvc", suffix: "win32-x64-msvc" },
  { triple: "aarch64-pc-windows-msvc", suffix: "win32-arm64-msvc" },
];

/**
 * Select the binding for the running OS, architecture, and C library.
 * @param {{ platform: string, arch: string, report?: { getReport(): unknown } }} [hostProcess]
 */
function hostTarget(hostProcess = process) {
  let abi = hostProcess.platform === "win32" ? "-msvc" : "";
  if (hostProcess.platform === "linux") {
    // Older Node typings misdescribe getReport(); normalize its runtime object shape.
    /** @type {{ header: { glibcVersionRuntime?: string } }} */
    const report = JSON.parse(JSON.stringify(hostProcess.report?.getReport()));
    abi = report.header.glibcVersionRuntime ? "-gnu" : "-musl";
  }
  const suffix = `${hostProcess.platform}-${hostProcess.arch}${abi}`;
  const target = nativeTargets.find((entry) => entry.suffix === suffix);
  assert(target, `Unsupported native host: ${suffix}`);
  return target;
}

module.exports = { nativeTargets, hostTarget };
