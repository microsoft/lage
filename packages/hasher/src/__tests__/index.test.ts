import path from "path";

import { Monorepo } from "@lage-run/monorepo-fixture";

import { WorkspaceInfo } from "workspace-tools";
import { PackageHashInfo } from "../hashOfPackage";
import { Hasher, addToQueue } from "../index";

const fixturesPath = path.join(__dirname, "..", "__fixtures__");

describe("addToQueue", () => {
  const setupAddToQueue = async () => {
    const monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, "monorepo"));
    const packageRoot = monorepo.root;

    const packageToAdd = "package-a";
    const packagePath = path.join(packageRoot, "packages", packageToAdd);
    const workspaces: WorkspaceInfo = [
      {
        name: packageToAdd,
        path: packagePath,
        packageJson: {
          name: "",
          packageJsonPath: "",
          version: "",
        },
      },
    ];
    const internalDependencies = [packageToAdd];

    const queue: string[] = [];
    const done: PackageHashInfo[] = [];

    return {
      internalDependencies,
      queue,
      done,
      workspaces,
      packageToAdd,
      packagePath,
    };
  };

  it("adds internal dependencies to the queue", async () => {
    const { internalDependencies, queue, done, workspaces, packagePath } = await setupAddToQueue();

    addToQueue(internalDependencies, queue, done, workspaces);

    const expectedQueue = [packagePath];
    expect(queue).toEqual(expectedQueue);
  });

  it("doesn't add to the queue if the package has been evaluated", async () => {
    let { internalDependencies, queue, done, workspaces, packageToAdd } = await setupAddToQueue();

    // Override
    done = [
      {
        name: packageToAdd,
        filesHash: "",
        dependenciesHash: "",
        internalDependencies: [],
      },
    ];

    addToQueue(internalDependencies, queue, done, workspaces);

    expect(queue).toEqual([]);
  });

  it("doesn't add to the queue if the package is already in the queue", async () => {
    let { internalDependencies, queue, done, workspaces, packagePath } = await setupAddToQueue();

    // Override
    queue = [packagePath];

    addToQueue(internalDependencies, queue, done, workspaces);

    const expectedQueue = [packagePath];
    expect(queue).toEqual(expectedQueue);
  });
});

describe("The main Hasher class", () => {
  const setupFixtureAndReturnHash = async (fixture = "monorepo") => {
    const monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, fixture));
    const packageRoot = monorepo.root;

    const buildSignature = "yarn build";

    const hasher = new Hasher(packageRoot);
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
