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

  async function hashAll(root: string, lockfile: string): Promise<Record<string, string>> {
    const monorepo = await setup(lockfile);
    const hasher = new TargetHasher({
      root: monorepo.root,
      environmentGlob: [],
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

  it("only changes the hash of packages whose lockfile closure changed", async () => {
    const baseHashes = await hashAll("base", baseLockfile);
    const changedHashes = await hashAll("changed", changedLockfile);

    // Only package c's closure changed in the lockfile.
    expect(changedHashes.a).toEqual(baseHashes.a);
    expect(changedHashes.b).toEqual(baseHashes.b);
    expect(changedHashes.c).not.toEqual(baseHashes.c);
  });

  it("produces the same hashes for the same lockfile across hasher instances", async () => {
    const first = await hashAll("first", baseLockfile);
    const second = await hashAll("second", baseLockfile);

    expect(second).toEqual(first);
  });
});
