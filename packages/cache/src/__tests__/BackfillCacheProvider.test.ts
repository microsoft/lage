import { afterEach, describe, expect, it } from "@jest/globals";
import createLogger from "@lage-run/logger";
import { createTempDir, makeAzureStorageClientMocks, Monorepo, removeTempDirAsync } from "@lage-run/test-utilities";
import type { Target } from "@lage-run/target-graph";
import fs from "fs-extra";
import path from "path";
import { NativeCacheValidationError } from "backfill-cache";
import { getCacheDirectory } from "../getCacheDirectory.js";
import { BackfillCacheProvider, type BackfillCacheProviderOptions } from "../providers/BackfillCacheProvider.js";

describe("BackfillCacheProvider", () => {
  let monorepo: Monorepo | undefined;
  const tempDirs: string[] = [];

  afterEach(async () => {
    await monorepo?.cleanup();
    monorepo = undefined;
    await Promise.all(tempDirs.map((d) => removeTempDirAsync(d, { throwOnError: true, maxAttempts: 3 })));
    tempDirs.length = 0;
  });

  function createTestRoot(): string {
    const root = createTempDir({ prefix: "backfill-cache-provider-" });
    tempDirs.push(root);
    fs.outputJsonSync(path.join(root, "packages", "a", "package.json"), { name: "a" });
    return root;
  }

  function makeTarget(root: string): Target {
    return {
      id: "a",
      cwd: path.join(root, "packages", "a"),
      depSpecs: [],
      dependents: [],
      dependencies: [],
      task: "command",
      label: "a - command",
    };
  }

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

  it("checks materialized output validity without changing files", async () => {
    const root = createTestRoot();
    const options: BackfillCacheProviderOptions = {
      logger: createLogger(),
      root,
      experimentalCacheHitOptimization: true,
      cacheOptions: { outputGlob: ["output.txt"] },
    };
    const provider = new BackfillCacheProvider(options);
    const target = makeTarget(root);
    const output = path.join(target.cwd, "output.txt");
    const hash = "validation-hash";
    await fs.writeFile(output, "original");

    expect(await provider.isUpToDate(hash, target)).toBe(false);
    expect(await provider.isUpToDate("", target)).toBe(false);
    await provider.put(hash, target);
    expect(await new BackfillCacheProvider(options).isUpToDate(hash, target)).toBe(true);

    await fs.writeFile(output, "modified");
    expect(await provider.isUpToDate(hash, target)).toBe(false);
    expect(await fs.readFile(output, "utf8")).toBe("modified");
  });

  it("does not probe remote providers through their fetch method", async () => {
    const root = createTestRoot();
    const { mockContainerClient, mockBlobClient } = makeAzureStorageClientMocks();
    const provider = new BackfillCacheProvider({
      logger: createLogger(),
      root,
      experimentalCacheHitOptimization: true,
      cacheOptions: {
        cacheStorageConfig: {
          provider: "azure-blob",
          options: { containerClient: mockContainerClient },
        },
      },
    });
    const target = makeTarget(root);

    expect(await provider.isUpToDate("remote-hash", target)).toBe(false);
    expect(mockBlobClient.download).not.toHaveBeenCalled();
  });

  it("does not hide explicitly requested native validation errors as cache misses", async () => {
    const root = createTestRoot();
    const provider = new BackfillCacheProvider({
      logger: createLogger(),
      root,
      experimentalCacheHitOptimization: true,
      cacheOptions: {},
    });
    const target = makeTarget(root);
    const previous = process.env.BACKFILL_CACHE_NATIVE;
    process.env.BACKFILL_CACHE_NATIVE = "invalid-mode";
    try {
      for (const experimentalCacheHitOptimization of [undefined, false]) {
        const legacy = new BackfillCacheProvider({
          logger: createLogger(),
          root,
          cacheOptions: {},
          experimentalCacheHitOptimization,
        });
        expect(await legacy.isUpToDate("hash", target)).toBe(false);
      }
      await expect(provider.isUpToDate("hash", target)).rejects.toThrow(NativeCacheValidationError);
    } finally {
      if (previous === undefined) {
        delete process.env.BACKFILL_CACHE_NATIVE;
      } else {
        process.env.BACKFILL_CACHE_NATIVE = previous;
      }
    }
  });
});
