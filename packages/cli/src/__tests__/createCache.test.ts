import { afterEach, describe, expect, it, jest } from "@jest/globals";
import createLogger from "@lage-run/logger";
import { Monorepo } from "@lage-run/test-utilities";
import fsPromises from "fs/promises";
import { getPackageInfosAsync } from "workspace-tools";
import { createCache } from "../cache/createCacheProvider.js";

describe("createCache", () => {
  let monorepo: Monorepo | undefined;

  afterEach(async () => {
    jest.restoreAllMocks();
    await monorepo?.cleanup();
    monorepo = undefined;
  });

  it("passes graph metadata to the hasher without rediscovering packages", async () => {
    monorepo = new Monorepo("createCache");
    await monorepo.init({
      packages: {
        foo: { internalDeps: ["bar"] },
        bar: {},
      },
    });
    const packageInfos = await getPackageInfosAsync(monorepo.root);
    const readFile = jest.spyOn(fsPromises, "readFile");
    const options = {
      root: monorepo.root,
      logger: createLogger(),
      cliArgs: [],
      skipLocalCache: false,
      packageInfos,
    };

    const { hasher } = await createCache(options);

    expect(hasher.dependencyMap.dependencies.get("foo")).toEqual(new Set(["bar"]));
    const packagePaths = new Set(Object.values(packageInfos).map((info) => info.packageJsonPath));
    expect(readFile.mock.calls.filter(([file]) => packagePaths.has(String(file)))).toEqual([]);
  });
});
