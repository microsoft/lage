import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { Monorepo } from "@lage-run/test-utilities";
import type { Target } from "@lage-run/target-graph";
import type * as BackfillHasher from "backfill-hasher";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { getPackageInfo, getPackageInfosAsync } from "workspace-tools";
import type * as TargetHasherModule from "../TargetHasher.js";

const fixturesPath = path.resolve(__dirname, "../__fixtures__");

jest.mock("backfill-hasher", () => {
  const actual = jest.requireActual<typeof BackfillHasher>("backfill-hasher");
  return { ...actual, resolveExternalDependencies: jest.fn(actual.resolveExternalDependencies) };
});

// Load after registering the mock: SWC does not hoist imported jest.mock calls.
const { resolveExternalDependencies } = jest.requireMock<typeof BackfillHasher>("backfill-hasher");
const { TargetHasher } = jest.requireActual<typeof TargetHasherModule>("../TargetHasher.js");

describe("TargetHasher", () => {
  let monorepos: Monorepo[] = [];

  afterEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    for (const monorepo of monorepos) {
      await monorepo.cleanup();
    }
    monorepos = [];
  });

  async function setupFixture(fixture = "monorepo") {
    const monorepo = new Monorepo("fixture");
    // These fixtures already have node_modules set up
    await monorepo.init({ fixturePath: path.join(fixturesPath, fixture), skipLink: true });
    monorepos.push(monorepo);
    return monorepo;
  }

  async function getHash(hasher: TargetHasherModule.TargetHasher, target: Target) {
    await hasher.initialize();
    const hash = await hasher.hash(target);
    hasher.cleanup();

    return hash;
  }

  function createTarget(root: string, packageName: string, task: string): Target {
    return {
      cwd: path.join(root, "packages", packageName),
      dependencies: [],
      dependents: [],
      depSpecs: [],
      id: `${packageName}#${task}`,
      label: `${packageName}#${task}`,
      packageName,
      task,
    };
  }

  it("resolves dependencies once per package without changing task hashes", async () => {
    const monorepo = await setupFixture();
    monorepo.writeFiles({
      "packages/package-a/package.json": {
        name: "package-a",
        version: "0.1.0",
        dependencies: { "package-b": "*", foo: "1.0.0" },
        devDependencies: { bar: "^2.0.0" },
      },
    });
    const targets = [
      createTarget(monorepo.root, "package-a", "build"),
      { ...createTarget(monorepo.root, "package-a", "test"), inputs: ["src/**"] },
      createTarget(monorepo.root, "package-b", "build"),
      createTarget(monorepo.root, "package-b", "test"),
    ];
    const coldHashes: string[] = [];
    for (const target of targets) {
      const coldHasher = new TargetHasher({ root: monorepo.root, environmentGlob: [] });
      coldHashes.push(await getHash(coldHasher, target));
    }

    jest.mocked(resolveExternalDependencies).mockClear();
    const hasher = new TargetHasher({ root: monorepo.root, environmentGlob: [] });
    await hasher.initialize();
    const hashes = await Promise.all(targets.map((target) => hasher.hash(target)));

    expect(hashes).toEqual(coldHashes);
    expect(hashes[0]).not.toEqual(hashes[1]);
    expect(await hasher.hash(targets[0])).toEqual(hashes[0]);
    expect(resolveExternalDependencies).toHaveBeenCalledTimes(2);
    expect(jest.mocked(resolveExternalDependencies).mock.calls.map(([dependencies]) => dependencies)).toEqual([
      { "package-b": "*", foo: "1.0.0", bar: "^2.0.0" },
      {},
    ]);
  });

  it.each(["lockfile", "manifest"])(
    "does not reuse resolved dependencies between repositories with different %s contents",
    async (change) => {
      const monorepo = await setupFixture();
      const packageInfo = { name: "package-a", version: "0.1.0", dependencies: { foo: "1.0.0" } };
      monorepo.writeFiles({ "packages/package-a/package.json": packageInfo });
      // Exclude files so only the resolved dependency list can change the hash.
      const target = { ...createTarget(monorepo.root, "package-a", "build"), inputs: [] };
      const hasher = new TargetHasher({ root: monorepo.root, environmentGlob: [] });
      const originalHash = await getHash(hasher, target);

      const nextMonorepo = await setupFixture();
      nextMonorepo.writeFiles({ "packages/package-a/package.json": packageInfo });
      nextMonorepo.writeFiles(
        change === "lockfile"
          ? { "yarn.lock": '# yarn lockfile v1\n\nfoo@1.0.0:\n  version "2.0.0"\n' }
          : { "packages/package-a/package.json": { ...packageInfo, dependencies: { foo: "2.0.0" } } }
      );
      const nextHasher = new TargetHasher({ root: nextMonorepo.root, environmentGlob: [] });
      const nextTarget = { ...createTarget(nextMonorepo.root, "package-a", "build"), inputs: [] };
      const nextHash = await getHash(nextHasher, nextTarget);

      expect(nextHash).not.toEqual(originalHash);
      expect(await hasher.hash(target)).toEqual(originalHash);
      expect(resolveExternalDependencies).toHaveBeenCalledTimes(2);
    }
  );

  it("reuses package dependencies without caching prerequisite task hashes", async () => {
    const monorepo = await setupFixture("monorepo-with-deps");
    const hasher = new TargetHasher({ root: monorepo.root, environmentGlob: [] });
    const dependency = createTarget(monorepo.root, "package-b", "build");
    const target = {
      ...createTarget(monorepo.root, "package-a", "build"),
      inputs: [],
      dependencies: [dependency.id],
    };
    await hasher.initialize();
    await hasher.hash(dependency);
    const originalHash = await hasher.hash(target);

    await hasher.hash({ ...dependency, inputs: [] });
    const nextHash = await hasher.hash(target);

    expect(nextHash).not.toEqual(originalHash);
    expect(resolveExternalDependencies).toHaveBeenCalledTimes(2);
  });

  it("does not resolve package dependencies for cached root targets", async () => {
    const monorepo = await setupFixture();
    const hasher = new TargetHasher({ root: monorepo.root, environmentGlob: [] });
    const target = {
      ...createTarget(monorepo.root, "root", "build"),
      cwd: monorepo.root,
      cache: true,
      inputs: ["package.json"],
    };
    const originalHash = await getHash(hasher, target);

    expect(await hasher.hash(target)).toEqual(originalHash);
    expect(resolveExternalDependencies).not.toHaveBeenCalled();
  });

  it("reuses supplied package metadata without rediscovery and preserves hashes", async () => {
    const monorepo = await setupFixture("monorepo-with-deps");
    const options = { root: monorepo.root, environmentGlob: [], packageInfos: await getPackageInfosAsync(monorepo.root) };
    const target = createTarget(monorepo.root, "package-a", "build");
    const discoveredHasher = new TargetHasher({ root: monorepo.root, environmentGlob: [] });
    const expectedHash = await getHash(discoveredHasher, target);
    const readFile = jest.spyOn(fsPromises, "readFile");
    const hasher = new TargetHasher(options);

    const actualHash = await getHash(hasher, target);

    expect(actualHash).toEqual(expectedHash);
    expect(hasher.dependencyMap).toEqual(discoveredHasher.dependencyMap);
    const packagePaths = new Set(Object.values(options.packageInfos).map((info) => info.packageJsonPath));
    expect(readFile.mock.calls.filter(([file]) => packagePaths.has(String(file)))).toEqual([]);
  });

  it("keeps supplied metadata local to each hasher instance", async () => {
    const monorepo = await setupFixture("monorepo-with-deps");
    const packageInfos = await getPackageInfosAsync(monorepo.root);
    const options = { root: monorepo.root, environmentGlob: [], packageInfos };
    const first = new TargetHasher(options);
    const firstHash = await getHash(first, createTarget(monorepo.root, "package-a", "build"));
    const changedOptions = {
      ...options,
      packageInfos: {
        ...packageInfos,
        "package-a": { ...packageInfos["package-a"], dependencies: {} },
      },
    };
    const second = new TargetHasher(changedOptions);
    const secondHash = await getHash(second, createTarget(monorepo.root, "package-a", "build"));

    expect(secondHash).not.toEqual(firstHash);
    expect(await getHash(first, createTarget(monorepo.root, "package-a", "build"))).toEqual(firstHash);
    const discovered = new TargetHasher({ root: monorepo.root, environmentGlob: [] });
    expect(await getHash(discovered, createTarget(monorepo.root, "package-a", "build"))).toEqual(firstHash);
  });

  it("retains the root package fallback when supplied metadata is empty", async () => {
    const monorepo = await setupFixture();
    const rootInfo = getPackageInfo(monorepo.root)!;
    const options = { root: monorepo.root, environmentGlob: [], packageInfos: {} };
    const hasher = new TargetHasher(options);

    await hasher.initialize();

    expect(hasher.packageTree!.getPackageFiles(rootInfo.name, ["package.json"])).toEqual(["package.json"]);
  });

  it("creates different hashes given different global environment glob", async () => {
    const monorepo1 = await setupFixture("monorepo-with-global-files");

    const hasher = new TargetHasher({ root: monorepo1.root, environmentGlob: ["some-global.config.js"] });
    const target = createTarget(monorepo1.root, "package-a", "build");
    const hash = await getHash(hasher, target);

    const hasher2 = new TargetHasher({ root: monorepo1.root, environmentGlob: [] });
    const target2 = createTarget(monorepo1.root, "package-a", "build");
    const hash2 = await getHash(hasher2, target2);

    expect(hash).not.toEqual(hash2);
  });

  it("creates different hashes given different fixtures", async () => {
    const monorepo1 = await setupFixture("monorepo");
    const hasher = new TargetHasher({ root: monorepo1.root, environmentGlob: [] });
    const target = createTarget(monorepo1.root, "package-a", "build");
    const hash = await getHash(hasher, target);

    const monorepo2 = await setupFixture("monorepo-different");
    const target2 = createTarget(monorepo2.root, "package-a", "build");
    const hasher2 = new TargetHasher({ root: monorepo2.root, environmentGlob: [] });
    const hash2 = await getHash(hasher2, target2);
    expect(hash).not.toEqual(hash2);
  });

  it("creates the same hash given the same fixture, with different target hasher instances", async () => {
    const monorepo1 = await setupFixture("monorepo");
    const hasher = new TargetHasher({ root: monorepo1.root, environmentGlob: [] });
    const target = createTarget(monorepo1.root, "package-a", "build");
    const hash = await getHash(hasher, target);

    const monorepo2 = await setupFixture("monorepo");
    const hasher2 = new TargetHasher({ root: monorepo2.root, environmentGlob: [] });
    const target2 = createTarget(monorepo2.root, "package-a", "build");
    const hash2 = await getHash(hasher2, target2);

    expect(hash).toEqual(hash2);
  });

  it("creates different hashes when a src file has changed", async () => {
    const monorepo1 = await setupFixture("monorepo");
    const hasher = new TargetHasher({ root: monorepo1.root, environmentGlob: [] });
    const target = createTarget(monorepo1.root, "package-a", "build");
    const hash = await getHash(hasher, target);

    const monorepo2 = await setupFixture("monorepo");
    const hasher2 = new TargetHasher({ root: monorepo2.root, environmentGlob: [] });
    const target2 = createTarget(monorepo2.root, "package-a", "build");

    monorepo2.commitFiles({ "packages/package-a/src/index.ts": "console.log('hello world');" });

    const hash2 = await getHash(hasher2, target2);

    expect(hash).not.toEqual(hash2);
  });

  it("creates different hashes when a src file has changed for a dependency", async () => {
    const monorepo1 = await setupFixture("monorepo-with-deps");
    const hasher = new TargetHasher({ root: monorepo1.root, environmentGlob: [] });
    const target = createTarget(monorepo1.root, "package-a", "build");
    target.inputs = ["**/*", "^**/*"];

    const hash = await getHash(hasher, target);

    const monorepo2 = await setupFixture("monorepo-with-deps");
    monorepo2.commitFiles({ "packages/package-b/src/index.ts": "console.log('hello world');" });

    const hasher2 = new TargetHasher({ root: monorepo2.root, environmentGlob: [] });
    const target2 = createTarget(monorepo2.root, "package-a", "build");
    target2.inputs = ["**/*", "^**/*"];

    const hash2 = await getHash(hasher2, target2);

    expect(hash).not.toEqual(hash2);
  });

  it("applies specific input file paths to dependencies", async () => {
    const monorepo1 = await setupFixture("monorepo-with-deps");
    const hasher = new TargetHasher({ root: monorepo1.root, environmentGlob: [] });
    const target = createTarget(monorepo1.root, "package-a", "build");
    target.inputs = ["**/*", "^src/index.ts"];

    const hash = await getHash(hasher, target);

    const monorepo2 = await setupFixture("monorepo-with-deps");
    monorepo2.commitFiles({ "packages/package-b/src/other.ts": "console.log('ignored');" });
    const hasher2 = new TargetHasher({ root: monorepo2.root, environmentGlob: [] });
    const target2 = createTarget(monorepo2.root, "package-a", "build");
    target2.inputs = ["**/*", "^src/index.ts"];

    const hash2 = await getHash(hasher2, target2);

    const monorepo3 = await setupFixture("monorepo-with-deps");
    monorepo3.commitFiles({ "packages/package-b/src/index.ts": "console.log('included');" });
    const hasher3 = new TargetHasher({ root: monorepo3.root, environmentGlob: [] });
    const target3 = createTarget(monorepo3.root, "package-a", "build");
    target3.inputs = ["**/*", "^src/index.ts"];

    const hash3 = await getHash(hasher3, target3);

    expect(hash).toEqual(hash2);
    expect(hash).not.toEqual(hash3);
  });

  it("creates different hashes when the target has a different env glob", async () => {
    const monorepo1 = await setupFixture("monorepo-with-global-files");
    const hasher = new TargetHasher({ root: monorepo1.root, environmentGlob: [] });
    const target = createTarget(monorepo1.root, "package-a", "build");
    target.environmentGlob = ["some-global*"];
    target.inputs = ["**/*", "^**/*"];

    const hash = await getHash(hasher, target);

    const target2 = createTarget(monorepo1.root, "package-a", "build");
    target2.environmentGlob = ["some-global.*"];
    target2.inputs = ["**/*", "^**/*"];

    const hash2 = await getHash(hasher, target2);

    expect(hash).not.toEqual(hash2);
  });

  it("creates different hashes when the target has a different env glob for different task types", async () => {
    const monorepo1 = await setupFixture("monorepo-with-global-files-different-tasks");
    const hasher = new TargetHasher({ root: monorepo1.root, environmentGlob: [] });
    const target = createTarget(monorepo1.root, "package-a", "test");
    target.environmentGlob = ["some-global*"];
    target.inputs = ["**/*", "^**/*"];

    const hash = await getHash(hasher, target);

    const target2 = createTarget(monorepo1.root, "package-a", "lint");
    target2.environmentGlob = [".eslintrc.js"];
    target2.inputs = ["**/*", "^**/*"];

    const hash2 = await getHash(hasher, target2);
    const target3 = createTarget(monorepo1.root, "package-a", "lint");
    fs.writeFileSync(path.join(monorepo1.root, ".eslintrc.js"), "module.exports = {/*somethingdifferent*/};");
    target3.environmentGlob = [".eslintrc.js"];
    target3.inputs = ["**/*", "^**/*"];

    const hash3 = await getHash(hasher, target3);

    expect(hash).not.toEqual(hash2);
    expect(hash2).not.toEqual(hash3);
  });
});
