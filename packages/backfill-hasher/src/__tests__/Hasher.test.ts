import { afterEach, describe, expect, it } from "@jest/globals";
import path from "path";

import {
  removeTempDir,
  setupFixture,
  type FixtureName,
} from "@lage-run/test-utilities";
import { makeLogger } from "backfill-logger";

import { getPackageInfos } from "workspace-tools";
import { Hasher, _addToQueue } from "../Hasher.js";

const logger = makeLogger("mute");

type QueueParams = Parameters<typeof _addToQueue>[0];

describe("_addToQueue", () => {
  let root = "";

  afterEach(() => {
    root && removeTempDir(root);
    root = "";
  });

  const initFixture = () => {
    root = setupFixture("monorepo");

    const packageToAdd = "package-a";
    const packageInfos = getPackageInfos(root);
    const packagePath = path.dirname(
      packageInfos[packageToAdd].packageJsonPath
    );

    const queueParams: QueueParams = {
      dependencyNames: [packageToAdd],
      queue: [],
      done: [],
      packageInfos,
    };

    return {
      queueParams,
      packageToAdd,
      packagePath,
    };
  };

  it("adds internal dependencies to the queue", () => {
    const { queueParams, packagePath } = initFixture();

    _addToQueue(queueParams);

    expect(queueParams.queue).toEqual([packagePath]);
  });

  it("doesn't add to the queue if the package has been evaluated", () => {
    const { queueParams, packageToAdd } = initFixture();

    // Override
    queueParams.done = [
      {
        name: packageToAdd,
        filesHash: "",
        dependenciesHash: "",
        internalDependencies: [],
      },
    ];

    _addToQueue(queueParams);

    expect(queueParams.queue).toEqual([]);
  });

  it("doesn't add to the queue if the package is already in the queue", () => {
    const { queueParams, packagePath } = initFixture();

    // Override
    queueParams.queue = [packagePath];

    _addToQueue(queueParams);

    expect(queueParams.queue).toEqual([packagePath]);
  });
});

describe("Hasher", () => {
  let roots: string[] = [];

  afterEach(() => {
    for (const root of roots) {
      removeTempDir(root);
    }
    roots = [];
  });

  async function setupFixtureAndReturnHash(fixture: FixtureName = "monorepo") {
    const root = setupFixture(fixture);
    roots.push(root);

    const hasher = new Hasher({ packageRoot: root }, logger);
    const hash = await hasher.createPackageHash("yarn build");

    return hash;
  }

  it("creates different hashes given different fixtures", async () => {
    const hash = await setupFixtureAndReturnHash();

    const hashOfBasic = await setupFixtureAndReturnHash("basic");
    expect(hash).not.toEqual(hashOfBasic);

    const hashOfMonorepoAgain = await setupFixtureAndReturnHash();
    expect(hash).toEqual(hashOfMonorepoAgain);
  });
});
