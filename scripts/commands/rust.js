// Shared build and artifact tooling for glob-hasher's native packages.
// Compilation and copy builds stay package-local for caching; CI assembles downloaded bindings.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const execa = require("execa");
const { isCI } = require("../isCI.js");
const { nativeTargets, hostTarget } = require("../rust/constants.js");

const repoRoot = path.resolve(__dirname, "../..");

/**
 * Locate `glob-hasher` or a nested platform-specific package.
 * @param {string} root
 * @param {string} name
 */
function packageDirectory(root, name) {
  const packages = name === "glob-hasher" ? "packages" : "packages/glob-hasher-native";
  return path.join(root, packages, name);
}

/**
 * Reject targets that have no corresponding published binary package.
 * @param {string} triple
 */
function getTarget(triple) {
  const target = nativeTargets.find((entry) => entry.triple === triple);
  assert(target, `Unsupported native target: ${triple}`);
  return target;
}

/**
 * Copy a platform package's binding from `glob-hasher` if that target has been built.
 * @param {string} directory
 * @param {string} [root]
 */
function copyBinding(directory, root = repoRoot) {
  const { main } = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8"));
  assert(typeof main === "string" && main.endsWith(".node"), "rust copy must run from a native binary package");
  const source = path.join(root, "packages/glob-hasher", main);
  if (!fs.existsSync(source)) {
    return false;
  }
  fs.copyFileSync(source, path.join(directory, main));
  return true;
}

/**
 * Assemble downloaded CI bindings into platform workspaces and the local host wrapper.
 * @param {string} root
 * @param {string} source
 * @param {string[]} triples
 */
function assembleArtifacts(root, source, triples = nativeTargets.map(({ triple }) => triple)) {
  // Validate the entire requested set before staging any files from it.
  const artifacts = triples.map((triple) => {
    const { suffix } = getTarget(triple);
    const bytes = fs.readFileSync(path.join(source, `glob-hasher-${triple}`, `glob-hasher.${suffix}.node`));
    return { bytes, suffix };
  });
  const host = hostTarget();
  for (const { bytes, suffix } of artifacts) {
    const filename = `glob-hasher.${suffix}.node`;
    const directory = packageDirectory(root, `glob-hasher-${suffix}`);
    fs.writeFileSync(path.join(directory, filename), bytes);
    if (suffix === host.suffix) {
      // Workspace tests and CLI bundling load the host binding beside the wrapper's loader.
      const wrapper = path.join(root, "packages/glob-hasher");
      fs.writeFileSync(path.join(wrapper, filename), bytes);
    }
  }
}

/**
 * Update generated bindings locally, or validate them without modifying source files in CI.
 * @param {string} directory
 */
function syncGeneratedBindings(directory) {
  for (const filename of ["index.js", "index.d.ts"]) {
    const destination = path.join(directory, filename);
    const generated = fs.readFileSync(path.join(directory, "temp", filename), "utf8").replace(/\r\n/g, "\n");
    const checkedIn = fs.readFileSync(destination, "utf8").replace(/\r\n/g, "\n");
    if (isCI()) {
      assert.equal(generated, checkedIn, `Generated ${filename} changed; run a local native build and commit the updated bindings`);
    } else if (generated !== checkedIn) {
      fs.writeFileSync(destination, generated);
    }
  }
}

/**
 * Compile with locked Cargo dependencies, updating bindings locally or checking them in CI.
 * @param {string[]} args Additional NAPI-RS build options, including an optional cross-compilation target.
 */
function buildNative(args) {
  const targetIndex = args.indexOf("--target");
  if (targetIndex !== -1) {
    getTarget(args[targetIndex + 1].split(".")[0]);
  }
  const cwd = path.join(repoRoot, "packages/glob-hasher");
  const cliManifestPath = require.resolve("@napi-rs/cli/package.json", { paths: [cwd] });
  const cliManifest = JSON.parse(fs.readFileSync(cliManifestPath, "utf8"));
  const cli = path.resolve(path.dirname(cliManifestPath), cliManifest.bin.napi);
  // Generate into temp so CI can validate without modifying the checked-in bindings.
  fs.mkdirSync(path.join(cwd, "temp"), { recursive: true });
  execa.sync(
    process.execPath,
    [cli, "build", "--platform", "--release", "--js", "temp/index.js", "--dts", "temp/index.d.ts", ...args, "--", "--locked"],
    { cwd, stdio: "inherit" }
  );
  syncGeneratedBindings(cwd);
}

// Importing helpers from Lage configuration or tests must not execute a CLI command.
if (require.main === module) {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    // build [NAPI-RS options]: compile and update bindings locally, or validate them in CI.
    case "build":
      buildNative(args);
      break;
    // copy: copy the current platform package's binding if it exists in the wrapper.
    case "copy":
      copyBinding(process.cwd());
      break;
    // assemble <directory> [triple]: validate downloaded artifacts and stage all targets, or one target.
    case "assemble":
      assert(args[0], "Usage: monorepo-scripts rust assemble <directory> [triple]");
      assembleArtifacts(repoRoot, path.resolve(args[0]), args[1] ? [args[1]] : undefined);
      break;
    default:
      throw new Error(`Invalid command: ${command}`);
  }
}

module.exports = { copyBinding, syncGeneratedBindings, assembleArtifacts };
