import createLogger from "@lage-run/logger";
import { Monorepo } from "@lage-run/test-utilities";
import type { Target } from "@lage-run/target-graph";
import path from "path";
import { getCacheDirectory } from "../getCacheDirectory.js";
import { BackfillCacheProvider, type BackfillCacheProviderOptions } from "../providers/BackfillCacheProvider.js";

describe("BackfillCacheProvider", () => {
  let monorepo: Monorepo | undefined;

  afterEach(async () => {
    await monorepo?.cleanup();
    monorepo = undefined;
  });

  it("should fetch a cache of the outputs as specified in the outputs folder in target", async () => {
    const logger = createLogger();
    monorepo = new Monorepo("fetch-cache");

    await monorepo.init({ packages: { a: {} } });

    const options: BackfillCacheProviderOptions = {
      logger,
      root: monorepo.root,
      cacheOptions: {
        outputGlob: ["output.txt"],
      },
    };

    const provider = new BackfillCacheProvider(options);

    const target: Target = {
      id: "a",
      cwd: path.join(monorepo.root, "packages/a"),
      depSpecs: [],
      dependents: [],
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = "some-hash";

    const cacheDir = getCacheDirectory(monorepo.root, hash);

    monorepo.writeFiles({
      [path.join(cacheDir, hash, "output.txt")]: "output",
    });

    const fetchResult = await provider.fetch(hash, target);

    const contents = monorepo.readFiles(["packages/a/output.txt"]);

    expect(contents["packages/a/output.txt"]).toBe("output");
    expect(fetchResult).toBeTruthy();
  });

  it("should put a cache of the outputs as specified in the outputs folder in target", async () => {
    const logger = createLogger();
    monorepo = new Monorepo("put-cache");

    await monorepo.init({ packages: { a: {} } });

    const options: BackfillCacheProviderOptions = {
      logger,
      root: monorepo.root,
      cacheOptions: {
        outputGlob: ["output.txt"],
      },
    };

    const provider = new BackfillCacheProvider(options);

    const target: Target = {
      id: "a",
      cwd: path.join(monorepo.root, "packages/a"),
      depSpecs: [],
      dependents: [],
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = "some-hash";

    monorepo.writeFiles({
      "packages/a/output.txt": "output",
    });

    await provider.put(hash, target);

    const cacheDir = getCacheDirectory(monorepo.root, hash);

    const outputFilePath = path.join(cacheDir, hash, "output.txt");
    const contents = monorepo.readFiles([outputFilePath]);

    expect(contents[outputFilePath]).toBe("output");
  });
});
