import { afterEach, describe, expect, it } from "@jest/globals";
import { Monorepo } from "@lage-run/test-utilities";
import type { Target } from "@lage-run/target-graph";
import path from "path";
import { TargetHasher } from "../TargetHasher.js";

const baseLockfile = `lockfileVersion: '9.0'

importers:

  .: {}

  packages/a:
    dependencies:
      semver:
        specifier: 7.5.4
        version: 7.5.4

  packages/b:
    dependencies:
      chalk:
        specifier: 4.1.2
        version: 4.1.2

  packages/c:
    dependencies:
      js-yaml:
        specifier: 4.1.0
        version: 4.1.0

snapshots:

  semver@7.5.4: {}

  chalk@4.1.2: {}

  js-yaml@4.1.0: {}
`;

// Only packages/c's dependency (js-yaml) changes.
const changedLockfile = baseLockfile.replace(/4\.1\.0/g, "4.2.0");

const rootImporterChangedLockfile = baseLockfile
  .replace(
    "  .: {}",
    `  .:
    devDependencies:
      typescript:
        specifier: 5.8.3
        version: 5.8.3`
  )
  .replace(
    "snapshots:\n",
    `snapshots:

  typescript@5.8.3: {}
`
  );

const unsupportedLockfile = `lockfileVersion: '8.0'
importers:
  .: {}
  packages/a: {}
  packages/b: {}
  packages/c: {}
`;

const malformedLockfile = `lockfileVersion: '9.0'
importers:
  .: {}
  packages/a:
    dependencies:
      invalid: 1.0.0
  packages/b: {}
  packages/c: {}
`;

describe("TargetHasher with experimental pnpm lockfile invalidation", () => {
  let monorepos: Monorepo[] = [];

  afterEach(async () => {
    for (const monorepo of monorepos) {
      await monorepo.cleanup();
    }
    monorepos = [];
  });

  async function setup(lockfile: string): Promise<Monorepo> {
    const monorepo = new Monorepo("hasher-lockfile-invalidation");
    await monorepo.init({ packages: { a: {}, b: {}, c: {} } });
    monorepo.writeFiles({ "pnpm-lock.yaml": lockfile });
    monorepos.push(monorepo);
    return monorepo;
  }

  function createTarget(root: string, packageName: string): Target {
    return {
      cwd: path.join(root, "packages", packageName),
      dependencies: [],
      dependents: [],
      depSpecs: [],
      id: `${packageName}#build`,
      label: `${packageName}#build`,
      packageName,
      task: "build",
    };
  }

  function createRootTarget(root: string): Target {
    return {
      cache: true,
      cwd: root,
      dependencies: [],
      dependents: [],
      depSpecs: [],
      id: "//#build",
      inputs: ["lage.config.js"],
      label: "//#build",
      task: "build",
    };
  }

  async function hashAll(root: string, lockfile: string, environmentGlob: string[] = []): Promise<Record<string, string>> {
    const monorepo = await setup(lockfile);
    const hasher = new TargetHasher({
      root: monorepo.root,
      environmentGlob,
      experimentalLockfileInvalidation: { packageManager: "pnpm" },
    });
    await hasher.initialize();
    const result: Record<string, string> = {};
    for (const pkg of ["a", "b", "c"]) {
      result[pkg] = await hasher.hash(createTarget(monorepo.root, pkg));
    }
    hasher.cleanup();
    return result;
  }

  async function hashRoot(lockfile: string): Promise<string> {
    const monorepo = await setup(lockfile);
    const hasher = new TargetHasher({
      root: monorepo.root,
      environmentGlob: [],
      experimentalLockfileInvalidation: { packageManager: "pnpm" },
    });
    await hasher.initialize();
    const result = await hasher.hash(createRootTarget(monorepo.root));
    hasher.cleanup();
    return result;
  }

  it("only changes the hash of packages whose lockfile closure changed", async () => {
    const baseHashes = await hashAll("base", baseLockfile);
    const changedHashes = await hashAll("changed", changedLockfile);

    // Only package c's closure changed in the lockfile.
    expect(changedHashes.a).toEqual(baseHashes.a);
    expect(changedHashes.b).toEqual(baseHashes.b);
    expect(changedHashes.c).not.toEqual(baseHashes.c);
  });

  it("owns lockfile matches from wildcard environment globs", async () => {
    const baseHashes = await hashAll("base", baseLockfile, ["**/*.yaml"]);
    const changedHashes = await hashAll("changed", changedLockfile, ["**/*.yaml"]);

    expect(changedHashes.a).toEqual(baseHashes.a);
    expect(changedHashes.b).toEqual(baseHashes.b);
    expect(changedHashes.c).not.toEqual(baseHashes.c);
  });

  it("produces the same hashes for the same lockfile across hasher instances", async () => {
    const first = await hashAll("first", baseLockfile);
    const second = await hashAll("second", baseLockfile);

    expect(second).toEqual(first);
  });

  it("changes every package hash when the root importer closure changes", async () => {
    const baseHashes = await hashAll("base", baseLockfile);
    const changedHashes = await hashAll("changed", rootImporterChangedLockfile);

    expect(changedHashes.a).not.toEqual(baseHashes.a);
    expect(changedHashes.b).not.toEqual(baseHashes.b);
    expect(changedHashes.c).not.toEqual(baseHashes.c);
  });

  it("changes every package hash when precise lockfile analysis is unsupported", async () => {
    const baseHashes = await hashAll("base", unsupportedLockfile);
    const changedHashes = await hashAll("changed", `${unsupportedLockfile}\nunknownField: changed\n`);

    expect(changedHashes.a).not.toEqual(baseHashes.a);
    expect(changedHashes.b).not.toEqual(baseHashes.b);
    expect(changedHashes.c).not.toEqual(baseHashes.c);
  });

  it("changes every package hash when malformed v9 lockfile content changes", async () => {
    const baseHashes = await hashAll("base", malformedLockfile);
    const changedHashes = await hashAll("changed", `${malformedLockfile}\nunknownField: changed\n`);

    expect(changedHashes.a).not.toEqual(baseHashes.a);
    expect(changedHashes.b).not.toEqual(baseHashes.b);
    expect(changedHashes.c).not.toEqual(baseHashes.c);
  });

  it("changes every package hash when global installation settings change", async () => {
    const baseHashes = await hashAll("base", `settings:\n  autoInstallPeers: true\n${baseLockfile}`);
    const changedHashes = await hashAll("changed", `settings:\n  autoInstallPeers: false\n${baseLockfile}`);

    expect(changedHashes.a).not.toEqual(baseHashes.a);
    expect(changedHashes.b).not.toEqual(baseHashes.b);
    expect(changedHashes.c).not.toEqual(baseHashes.c);
  });

  it("includes all lockfile importers in cached root target hashes", async () => {
    expect(await hashRoot(changedLockfile)).not.toEqual(await hashRoot(baseLockfile));
    expect(await hashRoot(rootImporterChangedLockfile)).not.toEqual(await hashRoot(baseLockfile));
  });

  it("refreshes lockfile signatures for long-lived hasher instances", async () => {
    const monorepo = await setup(baseLockfile);
    const hasher = new TargetHasher({
      root: monorepo.root,
      environmentGlob: [],
      experimentalLockfileInvalidation: { packageManager: "pnpm" },
    });
    await hasher.initialize();
    const target = createTarget(monorepo.root, "c");
    const originalHash = await hasher.hash(target);

    monorepo.writeFiles({ "pnpm-lock.yaml": baseLockfile.replace(/4\.1\.0/g, "4.20.0") });
    hasher.refreshLockfileSignatures();

    expect(await hasher.hash(target)).not.toEqual(originalHash);
    hasher.cleanup();
  });
});
