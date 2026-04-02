import { afterEach, describe, expect, it } from "@jest/globals";
import createLogger from "@lage-run/logger";
import { Monorepo, removeTempDirAsync } from "@lage-run/test-utilities";
import type { Target } from "@lage-run/target-graph";
import path from "path";
import fs from "fs-extra";
import { PassThrough } from "stream";
import { buffer } from "stream/consumers";
import { makeAzureStorageClientMocks } from "@lage-run/test-utilities";
import { BackfillCacheProvider, type BackfillCacheProviderOptions } from "../providers/BackfillCacheProvider.js";

describe("BackfillCacheProvider with Azure Blob storage", () => {
  let monorepo: Monorepo | undefined;

  function makeTarget(monorepoRoot: string): Target {
    return {
      id: "a",
      cwd: path.join(monorepoRoot, "packages/a"),
      depSpecs: [],
      dependents: [],
      dependencies: [],
      task: "build",
      label: "a - build",
    };
  }

  afterEach(async () => {
    await monorepo?.cleanup();
    monorepo = undefined;
  });

  it("put() and fetch() round-trip: files are uploaded and restored correctly", async () => {
    const logger = createLogger();
    monorepo = new Monorepo("azure-roundtrip");
    await monorepo.init({ packages: { a: {} } });

    const { mockContainerClient, mockBlobClient, mockBlockBlobClient } = makeAzureStorageClientMocks();

    // Capture the tar produced by put()
    let capturedTarBuffer: Buffer = Buffer.alloc(0);
    mockBlockBlobClient.uploadStream.mockImplementation(async (stream: NodeJS.ReadableStream) => {
      capturedTarBuffer = await buffer(stream);
    });

    const options: BackfillCacheProviderOptions = {
      logger,
      root: monorepo.root,
      cacheOptions: {
        outputGlob: ["lib/**"],
        cacheStorageConfig: {
          provider: "azure-blob",
          options: { containerClient: mockContainerClient },
        },
      },
    };

    const provider = new BackfillCacheProvider(options);
    const target = makeTarget(monorepo.root);
    const hash = "azure-roundtrip-hash";

    // --- initial cache miss ---
    // including this step would catch caching bugs with globbing
    const initialFetchResult = await provider.fetch(hash, target);
    expect(initialFetchResult).toBe(false);
    expect(mockBlobClient.download).toHaveBeenCalledWith(0);

    // --- put phase ---
    monorepo.writeFiles({ "packages/a/lib/index.js": "module.exports = {}" });
    await provider.put(hash, target);

    expect(mockBlockBlobClient.uploadStream).toHaveBeenCalledTimes(1);
    expect(capturedTarBuffer.length).toBeGreaterThan(0);

    // --- fetch phase ---
    const replayStream = new PassThrough();
    replayStream.end(capturedTarBuffer);
    mockBlobClient.download.mockResolvedValue({ readableStreamBody: replayStream });

    // Remove output to simulate a fresh checkout
    await removeTempDirAsync(path.join(monorepo.root, "packages/a/lib"), {
      throwOnError: true,
      maxAttempts: 4,
    });

    const fetchResult = await provider.fetch(hash, target);

    expect(fetchResult).toBe(true);
    expect(mockBlobClient.download).toHaveBeenCalledWith(0);
    expect(fs.readFileSync(path.join(monorepo.root, "packages/a/lib/index.js"), "utf-8")).toBe("module.exports = {}");
  });

  it("fetch() returns false on a 404 (cache miss)", async () => {
    const logger = createLogger();
    monorepo = new Monorepo("azure-fetch-miss");
    await monorepo.init({ packages: { a: {} } });

    const { mockContainerClient, mockBlobClient } = makeAzureStorageClientMocks();
    mockBlobClient.download.mockRejectedValue({ statusCode: 404, message: "BlobNotFound" });

    const options: BackfillCacheProviderOptions = {
      logger,
      root: monorepo.root,
      cacheOptions: {
        cacheStorageConfig: { provider: "azure-blob", options: { containerClient: mockContainerClient } },
      },
    };

    const provider = new BackfillCacheProvider(options);
    const target = makeTarget(monorepo.root);

    const result = await provider.fetch("missing-hash", target);

    expect(result).toBe(false);
  });

  it("fetch() returns false on non-404 Azure errors (error is swallowed)", async () => {
    const logger = createLogger();
    monorepo = new Monorepo("azure-fetch-error");
    await monorepo.init({ packages: { a: {} } });

    const { mockContainerClient, mockBlobClient } = makeAzureStorageClientMocks();
    mockBlobClient.download.mockRejectedValue({ statusCode: 403, message: "AuthorizationFailure" });

    const options: BackfillCacheProviderOptions = {
      logger,
      root: monorepo.root,
      cacheOptions: {
        cacheStorageConfig: { provider: "azure-blob", options: { containerClient: mockContainerClient } },
      },
    };

    const provider = new BackfillCacheProvider(options);
    const target = makeTarget(monorepo.root);

    // BackfillCacheProvider catches all errors from cacheStorage.fetch() and returns false
    const result = await provider.fetch("error-hash", target);

    expect(result).toBe(false);
  });

  it("fetch() respects maxSize: returns false without downloading when blob is too large", async () => {
    const logger = createLogger();
    monorepo = new Monorepo("azure-maxsize");
    await monorepo.init({ packages: { a: {} } });

    const { mockContainerClient, mockBlobClient } = makeAzureStorageClientMocks();
    mockBlobClient.getProperties.mockResolvedValue({ contentLength: 10_000_000 }); // 10 MB

    const options: BackfillCacheProviderOptions = {
      logger,
      root: monorepo.root,
      cacheOptions: {
        cacheStorageConfig: {
          provider: "azure-blob",
          options: { containerClient: mockContainerClient, maxSize: 1000 },
        },
      },
    };

    const provider = new BackfillCacheProvider(options);
    const target = makeTarget(monorepo.root);

    const result = await provider.fetch("big-hash", target);

    expect(result).toBe(false);
    expect(mockBlobClient.download).not.toHaveBeenCalled();
  });

  it("containerClient injection flows through the full config stack", async () => {
    // Verifies that cacheStorageConfig.options.containerClient is not stripped
    // by createBackfillCacheConfig() — if it were, we'd get a local provider instead.
    const logger = createLogger();
    monorepo = new Monorepo("azure-config-wiring");
    await monorepo.init({ packages: { a: {} } });

    const { mockContainerClient, mockBlobClient } = makeAzureStorageClientMocks();
    mockBlobClient.download.mockRejectedValue({ statusCode: 404 });

    const options: BackfillCacheProviderOptions = {
      logger,
      root: monorepo.root,
      cacheOptions: {
        cacheStorageConfig: { provider: "azure-blob", options: { containerClient: mockContainerClient } },
      },
    };

    const provider = new BackfillCacheProvider(options);
    const target = makeTarget(monorepo.root);

    await provider.fetch("wiring-check-hash", target);

    // If containerClient was stripped, getBlobClient would never be called
    // (the local provider would have been used instead, operating on the filesystem).
    expect(mockContainerClient.getBlobClient).toHaveBeenCalledWith("wiring-check-hash");
  });
});
