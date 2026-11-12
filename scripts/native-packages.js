// @ts-check
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const nativeTargets = [
  { triple: "x86_64-apple-darwin", suffix: "darwin-x64" },
  { triple: "aarch64-apple-darwin", suffix: "darwin-arm64" },
  { triple: "x86_64-unknown-linux-gnu", suffix: "linux-x64-gnu" },
  { triple: "aarch64-unknown-linux-gnu", suffix: "linux-arm64-gnu" },
  { triple: "x86_64-pc-windows-msvc", suffix: "win32-x64-msvc" },
  { triple: "aarch64-pc-windows-msvc", suffix: "win32-arm64-msvc" },
];

/** @param {string} triple */
function getTarget(triple) {
  const target = nativeTargets.find((entry) => entry.triple === triple);
  assert(target, `Unsupported native target: ${triple}`);
  return target;
}

function hostTarget() {
  if (process.platform === "linux") {
    /** @type {{ header: { glibcVersionRuntime?: string } }} */
    const report = JSON.parse(JSON.stringify(process.report?.getReport()));
    assert(report.header.glibcVersionRuntime, "glob-hasher does not publish musl binaries");
  }
  const suffix = `${process.platform}-${process.arch}${process.platform === "linux" ? "-gnu" : process.platform === "win32" ? "-msvc" : ""}`;
  const target = nativeTargets.find((entry) => entry.suffix === suffix);
  assert(target, `Unsupported native host: ${suffix}`);
  return target;
}

/** @param {string} root */
function revision(root) {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
}

/** @param {Buffer} bytes */
function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** @param {string} root */
function validateVersions(root) {
  const wrapper = JSON.parse(fs.readFileSync(path.join(root, "packages/glob-hasher/package.json"), "utf8"));
  for (const { suffix } of nativeTargets) {
    const name = `glob-hasher-${suffix}`;
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "packages", name, "package.json"), "utf8"));
    assert.equal(manifest.version, wrapper.version, `${name} must match glob-hasher's version`);
    assert(
      ["workspace:*", wrapper.version].includes(wrapper.optionalDependencies[name]),
      `${name} must be an exact-version optional dependency`
    );
  }
}

/** @param {string} root */
function stageBindings(root) {
  let count = 0;
  for (const { suffix } of nativeTargets) {
    const filename = `glob-hasher.${suffix}.node`;
    const source = path.join(root, "packages/glob-hasher", filename);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, path.join(root, "packages", `glob-hasher-${suffix}`, filename));
      count++;
    }
  }
  assert(count, "No native binding was built");
}

/** @param {string} root */
function stageLicenses(root) {
  for (const name of ["glob-hasher", ...nativeTargets.map(({ suffix }) => `glob-hasher-${suffix}`)]) {
    fs.copyFileSync(path.join(root, "LICENSE"), path.join(root, "packages", name, "LICENSE"));
  }
}

/**
 * @param {string} root
 * @param {string} triple
 * @param {string} destination
 */
function writeArtifact(root, triple, destination) {
  const { suffix } = getTarget(triple);
  const bytes = fs.readFileSync(path.join(root, "packages/glob-hasher", `glob-hasher.${suffix}.node`));
  const output = path.join(destination, `glob-hasher-${triple}`);
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, `glob-hasher.${suffix}.node`), bytes);
  fs.writeFileSync(path.join(output, "artifact.json"), JSON.stringify({ triple, revision: revision(root), sha256: digest(bytes) }) + "\n");
}

/**
 * @param {string} root
 * @param {string} triple
 * @param {string} source
 * @param {string} [expectedRevision]
 */
function readArtifact(root, triple, source, expectedRevision = revision(root)) {
  const { suffix } = getTarget(triple);
  const metadata = JSON.parse(fs.readFileSync(path.join(source, "artifact.json"), "utf8"));
  assert.equal(metadata.triple, triple, "Native artifact target does not match");
  assert.equal(metadata.revision, expectedRevision, "Native artifact must come from the checked-out revision");
  const bytes = fs.readFileSync(path.join(source, `glob-hasher.${suffix}.node`));
  assert.equal(metadata.sha256, digest(bytes), "Native artifact checksum does not match");
  return { bytes, metadata, suffix };
}

/**
 * @param {string} root
 * @param {string} source
 * @param {string[]} triples
 */
function assembleArtifacts(root, source, triples = nativeTargets.map(({ triple }) => triple)) {
  validateVersions(root);
  const artifacts = triples.map((triple) => readArtifact(root, triple, path.join(source, `glob-hasher-${triple}`)));
  const host = hostTarget();
  for (const { bytes, metadata, suffix } of artifacts) {
    const filename = `glob-hasher.${suffix}.node`;
    const directory = path.join(root, "packages", `glob-hasher-${suffix}`);
    fs.writeFileSync(path.join(directory, filename), bytes);
    fs.writeFileSync(path.join(directory, "artifact.json"), JSON.stringify(metadata) + "\n");
    if (suffix === host.suffix) {
      const wrapper = path.join(root, "packages/glob-hasher");
      fs.writeFileSync(path.join(wrapper, filename), bytes);
      fs.writeFileSync(path.join(wrapper, ".native-artifact.json"), JSON.stringify(metadata) + "\n");
    }
  }
  stageLicenses(root);
}

/** @param {string} root */
function validateReleaseBindings(root) {
  validateVersions(root);
  const expectedRevision = process.env.GLOB_HASHER_SOURCE_REVISION || revision(root);
  for (const { triple, suffix } of nativeTargets) {
    readArtifact(root, triple, path.join(root, "packages", `glob-hasher-${suffix}`), expectedRevision);
  }
  stageLicenses(root);
}

/** @param {string[]} args */
function buildNative(args) {
  const targetIndex = args.indexOf("--target");
  const target = targetIndex === -1 ? hostTarget() : getTarget(args[targetIndex + 1]);
  const cwd = path.join(repoRoot, "packages/glob-hasher");
  if (process.env.GLOB_HASHER_USE_PREBUILT === "1") {
    const metadata = JSON.parse(fs.readFileSync(path.join(cwd, ".native-artifact.json"), "utf8"));
    assert.equal(metadata.triple, target.triple, "Prebuilt binding target does not match");
    assert.equal(metadata.revision, revision(repoRoot), "Prebuilt binding is from another revision");
    assert.equal(
      metadata.sha256,
      digest(fs.readFileSync(path.join(cwd, `glob-hasher.${target.suffix}.node`))),
      "Prebuilt binding was modified"
    );
  } else {
    const cli = require.resolve("@napi-rs/cli/scripts/index.js", { paths: [cwd] });
    fs.mkdirSync(path.join(cwd, "temp"), { recursive: true });
    execFileSync(
      process.execPath,
      [cli, "build", "--platform", "--release", "--js", "temp/index.js", "--dts", "temp/index.d.ts", "--cargo-flags=--locked", ...args],
      { cwd, stdio: "inherit" }
    );
    for (const filename of ["index.js", "index.d.ts"]) {
      const generated = fs.readFileSync(path.join(cwd, "temp", filename), "utf8").replace(/\r\n/g, "\n");
      const checkedIn = fs.readFileSync(path.join(cwd, filename), "utf8").replace(/\r\n/g, "\n");
      assert.equal(
        generated,
        checkedIn,
        `Generated ${filename} changed; copy the generated file from packages/glob-hasher/temp and review it`
      );
    }
  }
  stageBindings(repoRoot);
  stageLicenses(repoRoot);
}

/**
 * @param {string} name
 * @param {string} destination
 */
function packPackage(name, destination) {
  fs.mkdirSync(destination, { recursive: true });
  const cwd = path.join(repoRoot, "packages", name);
  const manifest = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
  const filename = path.resolve(destination, `${name}-${manifest.version}.tgz`);
  execFileSync(process.execPath, [path.join(repoRoot, ".yarn/releases/yarn-4.18.1.cjs"), "pack", "--out", filename], {
    cwd,
    stdio: "inherit",
  });
  return filename;
}

/** @param {string} destination */
function preparePackageTest(destination) {
  validateVersions(repoRoot);
  stageLicenses(repoRoot);
  const { suffix } = hostTarget();
  const archives = [packPackage(`glob-hasher-${suffix}`, destination), packPackage("glob-hasher", destination)];
  fs.writeFileSync(
    path.join(destination, "package.json"),
    JSON.stringify({ name: "native-install-test", version: "0.0.0", private: true })
  );
  const npm = process.env.npm_execpath;
  const args = ["install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false", ...archives];
  if (npm && path.basename(npm) === "npm-cli.js") {
    execFileSync(process.execPath, [npm, ...args], { cwd: destination, stdio: "inherit" });
  } else if (process.platform === "win32") {
    const npmCli = path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
    execFileSync(process.execPath, [npmCli, ...args], { cwd: destination, stdio: "inherit" });
  } else {
    execFileSync("npm", args, { cwd: destination, stdio: "inherit" });
  }
}

/** @param {string} runId @param {string} destination */
function downloadArtifacts(runId, destination) {
  assert(/^\d+$/.test(runId), "A numeric GitHub Actions run ID is required");
  const run = JSON.parse(
    execFileSync(
      "gh",
      ["run", "view", runId, "--repo", "microsoft/lage", "--json", "headSha,headBranch,event,workflowName,status,conclusion"],
      { encoding: "utf8" }
    )
  );
  assert.equal(run.headSha, revision(repoRoot), "Native build must match the release revision");
  assert.equal(run.headBranch, "main", "Release artifacts must come from main");
  assert.equal(run.event, "push", "Release artifacts must come from a trusted push build");
  assert.equal(run.workflowName, "PR", "Unexpected native build workflow");
  assert.equal(run.status, "completed", "Native build has not finished");
  assert.equal(run.conclusion, "success", "Native build did not succeed");
  fs.mkdirSync(destination, { recursive: true });
  execFileSync("gh", ["run", "download", runId, "--repo", "microsoft/lage", "--pattern", "glob-hasher-*", "--dir", destination], {
    stdio: "inherit",
  });
}

if (require.main === module) {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case "build":
      buildNative(args);
      break;
    case "artifact":
      assert(args[0] && args[1], "Usage: native-packages.js artifact <triple> <directory>");
      writeArtifact(repoRoot, args[0], path.resolve(args[1]));
      break;
    case "assemble":
      assert(args[0], "Usage: native-packages.js assemble <directory> [triple]");
      assembleArtifacts(repoRoot, path.resolve(args[0]), args[1] ? [args[1]] : undefined);
      break;
    case "prepare-test":
      assert(args[0], "Usage: native-packages.js prepare-test <directory>");
      preparePackageTest(path.resolve(args[0]));
      break;
    case "download":
      assert(args[0] && args[1], "Usage: native-packages.js download <run-id> <directory>");
      downloadArtifacts(args[0], path.resolve(args[1]));
      break;
    case "release":
      validateReleaseBindings(repoRoot);
      fs.mkdirSync(path.join(repoRoot, "packed-packages"), { recursive: true });
      execFileSync(
        process.execPath,
        [path.join(repoRoot, ".yarn/releases/yarn-4.18.1.cjs"), "beachball", "publish", "-y", "--tag", "latest", ...args],
        {
          cwd: repoRoot,
          stdio: "inherit",
          env: { ...process.env, GLOB_HASHER_SOURCE_REVISION: revision(repoRoot) },
        }
      );
      break;
    default:
      throw new Error("Expected build, artifact, assemble, prepare-test, download, or release");
  }
}

module.exports = { nativeTargets, validateVersions, validateReleaseBindings, writeArtifact, assembleArtifacts };
