import path from "path";

import { TargetHasher } from "../index";

import { Monorepo } from "@lage-run/monorepo-fixture";
import { Target } from "@lage-run/target-graph";
const fixturesPath = path.join(__dirname, "..", "__fixtures__");

describe("The main Hasher class", () => {
  async function setupFixture(fixture = "monorepo") {
    const monorepo = new Monorepo("fixture");
    await monorepo.init(path.join(fixturesPath, fixture));
    return monorepo;
  }

  async function getHash(hasher: TargetHasher, target: Target) {
    await hasher.initialize();
    const hash = await hasher.hash(target);
    await hasher.cleanup();

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

    monorepo1.cleanup();
    monorepo2.cleanup();
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

    monorepo1.cleanup();
    monorepo2.cleanup();
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

    monorepo1.cleanup();
    monorepo2.cleanup();
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

    monorepo1.cleanup();
    monorepo2.cleanup();
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

    monorepo1.cleanup();
  });
});
