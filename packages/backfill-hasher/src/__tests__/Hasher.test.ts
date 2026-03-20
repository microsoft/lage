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

  it("adds internal dependencies to the queue", async () => {
    const { queueParams, packagePath } = initFixture();

    _addToQueue(queueParams);

    expect(queueParams.queue).toEqual([packagePath]);
  });

  it("doesn't add to the queue if the package has been evaluated", async () => {
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

  it("doesn't add to the queue if the package is already in the queue", async () => {
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

  const setupFixtureAndReturnHash = async (
    fixture: FixtureName = "monorepo"
  ) => {
    const packageRoot = setupFixture(fixture);
    roots.push(packageRoot);

    const options = { packageRoot, outputGlob: ["lib/**"] };
    const buildSignature = "yarn build";

    const hasher = new Hasher(options, logger);
    const hash = await hasher.createPackageHash(buildSignature);

    return hash;
  };

  it("creates different hashes given different fixtures", async () => {
    const hash = await setupFixtureAndReturnHash();

    const hashOfBasic = await setupFixtureAndReturnHash("basic");
    expect(hash).not.toEqual(hashOfBasic);

    const hashOfMonorepoAgain = await setupFixtureAndReturnHash();
    expect(hash).toEqual(hashOfMonorepoAgain);
  });
});
