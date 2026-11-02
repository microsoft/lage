import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { Monorepo } from "@lage-run/test-utilities";
import type { Target } from "@lage-run/target-graph";
import fs from "fs";
import path from "path";
import type * as TargetHasherModule from "../TargetHasher.js";
import type * as BackfillHasher from "backfill-hasher";
import type * as WorkspaceTools from "workspace-tools";

jest.mock("backfill-hasher", () => {
  const actual = jest.requireActual<typeof BackfillHasher>("backfill-hasher");
  return { ...actual, resolveExternalDependencies: jest.fn(actual.resolveExternalDependencies) };
});

jest.mock("workspace-tools", () => {
  const actual = jest.requireActual<typeof WorkspaceTools>("workspace-tools");
  return { ...actual, getPackageInfosAsync: jest.fn(actual.getPackageInfosAsync) };
});

const { TargetHasher } = jest.requireActual<typeof TargetHasherModule>("../TargetHasher.js");
const { resolveExternalDependencies } = jest.requireMock<typeof BackfillHasher>("backfill-hasher");
const { getPackageInfos, getPackageInfosAsync } = jest.requireMock<typeof WorkspaceTools>("workspace-tools");

const fixturesPath = path.resolve(__dirname, "../__fixtures__");

describe("TargetHasher", () => {
  let monorepos: Monorepo[] = [];

  afterEach(async () => {
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

  async function getHash(hasher: InstanceType<typeof TargetHasher>, target: Target) {
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

  it("reuses supplied package metadata and resolves dependencies once per package", async () => {
    const monorepo = await setupFixture();
    const packageInfos = getPackageInfos(monorepo.root);
    const options = { root: monorepo.root, environmentGlob: [] };
    const hasher = new TargetHasher({ ...options, packageInfos });
    await hasher.initialize();
    const build = createTarget(monorepo.root, "package-a", "build");
    const firstHash = await hasher.hash(build);
    await hasher.hash(createTarget(monorepo.root, "package-a", "test"));
    expect(resolveExternalDependencies).toHaveBeenCalledTimes(1);
    expect(getPackageInfosAsync).not.toHaveBeenCalled();

    await hasher.hash(createTarget(monorepo.root, "package-b", "build"));
    expect(resolveExternalDependencies).toHaveBeenCalledTimes(2);
    hasher.cleanup();

    const fallbackHasher = new TargetHasher(options);
    await fallbackHasher.initialize();
    expect(await fallbackHasher.hash(build)).toBe(firstHash);
    expect(getPackageInfosAsync).toHaveBeenCalledTimes(1);
    fallbackHasher.cleanup();
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

    await monorepo2.commitFiles({ "packages/package-a/src/index.ts": "console.log('hello world');" });

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
    await monorepo2.commitFiles({ "packages/package-b/src/index.ts": "console.log('hello world');" });

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
    await monorepo2.commitFiles({ "packages/package-b/src/other.ts": "console.log('ignored');" });
    const hasher2 = new TargetHasher({ root: monorepo2.root, environmentGlob: [] });
    const target2 = createTarget(monorepo2.root, "package-a", "build");
    target2.inputs = ["**/*", "^src/index.ts"];

    const hash2 = await getHash(hasher2, target2);

    const monorepo3 = await setupFixture("monorepo-with-deps");
    await monorepo3.commitFiles({ "packages/package-b/src/index.ts": "console.log('included');" });
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
