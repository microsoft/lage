import { Target } from "@lage-run/target-graph";

import { BackfillCacheProvider, BackfillCacheProviderOptions } from "../src/providers/BackfillCacheProvider";
import { Monorepo } from "@lage-run/monorepo-fixture";
import { _testResetEnvHash } from "../src/salt";
import path from "path";

describe("BackfillCacheProvider", () => {
  it("should fetch a cache of the outputs as specified in the outputs folder in target", async () => {
    const monorepo = new Monorepo("fetch-cache");

    await monorepo.init();
    await monorepo.install();

    await monorepo.addPackage("a");
    await monorepo.linkPackages();

    const options: BackfillCacheProviderOptions = {
      root: monorepo.root,
      cacheOptions: {
        outputGlob: ["output.txt"],
      },
    };

    const provider = new BackfillCacheProvider(options);

    const target: Target = {
      id: "a",
      cwd: path.join(monorepo.root, "packages/a"),
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = "some-hash";

    await monorepo.writeFiles({
      "packages/a/node_modules/.cache/backfill/some-hash/output.txt": "output",
    });

    const fetchResult = await provider.fetch(hash, target);

    const contents = await monorepo.readFiles(["packages/a/output.txt"]);

    expect(contents["packages/a/output.txt"]).toBe("output");
    expect(fetchResult).toBeTruth();

    await monorepo.cleanup();
  });

  it("should put a cache of the outputs as specified in the outputs folder in target", async () => {
    const monorepo = new Monorepo("put-cache");

    await monorepo.init();
    await monorepo.install();

    await monorepo.addPackage("a");
    await monorepo.linkPackages();

    const options: BackfillCacheProviderOptions = {
      root: monorepo.root,
      cacheOptions: {
        outputGlob: ["output.txt"],
      },
      isReadOnly: false,
    };

    const provider = new BackfillCacheProvider(options);

    const target: Target = {
      id: "a",
      cwd: path.join(monorepo.root, "packages/a"),
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = "some-hash";

    await monorepo.writeFiles({
      "packages/a/output.txt": "output",
    });

    await provider.put(hash, target);

    const outputFilePath = "packages/a/node_modules/.cache/backfill/some-hash/output.txt";
    const contents = await monorepo.readFiles([outputFilePath]);

    expect(contents[outputFilePath]).toBe("output");

    await monorepo.cleanup();
  });
});
