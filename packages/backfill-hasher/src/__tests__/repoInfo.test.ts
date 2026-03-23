import { removeTempDir, setupFixture } from "@lage-run/test-utilities";
import { getRepoInfo } from "../repoInfo.js";

describe("getRepoInfo()", () => {
  let root = "";

  afterEach(() => {
    root && removeTempDir(root);
    root = "";
  });

  it("works on a monorepo", async () => {
    root = setupFixture("monorepo");

    const repoInfo = await getRepoInfo(root);
    // This is essentially a snapshot of the results for the whole fixture
    expect(repoInfo).toEqual({
      packageHashes: {
        "": [
          ["package.json", "93fb6d8d4fdf54a913d0ebc60425ed12bd5784e2"],
          ["yarn.lock", "525969d57151bd6826e7cc743fa1451e7646c807"],
        ],
        "packages/package-a": [
          [
            "packages/package-a/node_modules/.bin/copy",
            "5c079d52564adf9932e18d7486d5b00d2e34f59a",
          ],
          [
            "packages/package-a/package.json",
            "fab1e7352e3df61824d457a83a6a3ef1fbf1a7a5",
          ],
          [
            "packages/package-a/src/index.ts",
            "85ce559e8f22b7dee6a5ed4be983fcafbeef9c72",
          ],
        ],
        "packages/package-b": [
          [
            "packages/package-b/node_modules/.bin/copy",
            "5c079d52564adf9932e18d7486d5b00d2e34f59a",
          ],
          [
            "packages/package-b/package.json",
            "83913856d9a5efa4a33cfb41825b8d8fee0c71a6",
          ],
          [
            "packages/package-b/src/index.ts",
            "85ce559e8f22b7dee6a5ed4be983fcafbeef9c72",
          ],
        ],
      },
      packageInfos: {
        // This is basic workspace-tools logic that doesn't need to be tested
        "package-a": expect.anything(),
        "package-b": expect.anything(),
      },
      parsedLock: {
        // This is also from workspace-tools. The parsing logic is reliable in this basic example
        // with yarn, but less so with pnpm or scenarios with peer deps.
        object: {
          "foo@1.0.0": {
            dependencies: { bar: "^1.0.0" },
            version: "1.0.0",
          },
        },
        type: "success",
      },
      repoHashes: {
        "package.json": "93fb6d8d4fdf54a913d0ebc60425ed12bd5784e2",
        "packages/package-a/node_modules/.bin/copy":
          "5c079d52564adf9932e18d7486d5b00d2e34f59a",
        "packages/package-a/package.json":
          "fab1e7352e3df61824d457a83a6a3ef1fbf1a7a5",
        "packages/package-a/src/index.ts":
          "85ce559e8f22b7dee6a5ed4be983fcafbeef9c72",
        "packages/package-b/node_modules/.bin/copy":
          "5c079d52564adf9932e18d7486d5b00d2e34f59a",
        "packages/package-b/package.json":
          "83913856d9a5efa4a33cfb41825b8d8fee0c71a6",
        "packages/package-b/src/index.ts":
          "85ce559e8f22b7dee6a5ed4be983fcafbeef9c72",
        "yarn.lock": "525969d57151bd6826e7cc743fa1451e7646c807",
      },
      root,
    });

    // Keys are sorted using basic ordering
    const repoHashesKeys = Object.keys(repoInfo.repoHashes);
    expect(repoHashesKeys).toEqual([...repoHashesKeys].sort());
  });
});
