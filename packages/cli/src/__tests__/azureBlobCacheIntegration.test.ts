/**
 * CLI-level integration tests for Azure Blob cache storage.
 *
 * These exercise the full RemoteFallbackCacheProvider hierarchy — local BackfillCacheProvider
 * (default filesystem cache) + remote BackfillCacheProvider (Azure blob mock via containerClient
 * injection) — which is the exact provider setup the CLI's runAction uses.
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import { BackfillCacheProvider, RemoteFallbackCacheProvider } from "@lage-run/cache";
import createLogger from "@lage-run/logger";
import type { Target } from "@lage-run/target-graph";
import { makeAzureStorageClientMocks, Monorepo } from "@lage-run/test-utilities";
import fs from "fs";
import path from "path";
import { PassThrough } from "stream";
import { buffer } from "stream/consumers";

// This is best to test in the CLI package since it needs mocks of the azure client
describe("Azure Blob cache integration via RemoteFallbackCacheProvider", () => {
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
      outputs: ["lib/**"],
    };
  }

  afterEach(async () => {
    await monorepo?.cleanup();
    monorepo = undefined;
  });

  it("put() with writeRemoteCache=true uploads to Azure remote", async () => {
    const logger = createLogger();
    monorepo = new Monorepo("cli-azure-put");
    await monorepo.init({ packages: { a: {} } });

    const { mockContainerClient, mockBlockBlobClient } = makeAzureStorageClientMocks();
    mockBlockBlobClient.uploadStream.mockImplementation(async (stream: NodeJS.ReadableStream) => {
      await buffer(stream); // consume so _put resolves
    });

    const remoteCacheProvider = new BackfillCacheProvider({
      logger,
      root: monorepo.root,
      cacheOptions: {
        outputGlob: ["lib/**"],
        cacheStorageConfig: { provider: "azure-blob", options: { containerClient: mockContainerClient } },
      },
    });

    const cacheProvider = new RemoteFallbackCacheProvider({
      root: monorepo.root,
      logger,
      // No local provider — only Azure remote
      localCacheProvider: undefined,
      remoteCacheProvider,
      writeRemoteCache: true,
    });

    const target = makeTarget(monorepo.root);
    monorepo.writeFiles({ "packages/a/lib/index.js": "console.log('hello')" });

    await cacheProvider.put("cli-put-hash", target);

    expect(mockBlockBlobClient.uploadStream).toHaveBeenCalledTimes(1);
  });

  it("put() without writeRemoteCache does NOT upload to Azure", async () => {
    const logger = createLogger();
    monorepo = new Monorepo("cli-azure-no-write");
    await monorepo.init({ packages: { a: {} } });

    const { mockContainerClient, mockBlockBlobClient } = makeAzureStorageClientMocks();

    const localCacheProvider = new BackfillCacheProvider({
      logger,
      root: monorepo.root,
      cacheOptions: { outputGlob: ["lib/**"] },
    });

    const remoteCacheProvider = new BackfillCacheProvider({
      logger,
      root: monorepo.root,
      cacheOptions: {
        outputGlob: ["lib/**"],
        cacheStorageConfig: { provider: "azure-blob", options: { containerClient: mockContainerClient } },
      },
    });

    const cacheProvider = new RemoteFallbackCacheProvider({
      root: monorepo.root,
      logger,
      localCacheProvider,
      remoteCacheProvider,
      writeRemoteCache: false,
    });

    const target = makeTarget(monorepo.root);
    monorepo.writeFiles({ "packages/a/lib/index.js": "console.log('hello')" });

    await cacheProvider.put("cli-no-write-hash", target);

    expect(mockBlockBlobClient.uploadStream).not.toHaveBeenCalled();
  });

  it("fetch() round-trip: put to Azure, then fetch restores files", async () => {
    const logger = createLogger();
    monorepo = new Monorepo("cli-azure-roundtrip");
    await monorepo.init({ packages: { a: {} } });

    const { mockContainerClient, mockBlobClient, mockBlockBlobClient } = makeAzureStorageClientMocks();

    // Capture the tar produced by put
    let capturedTarBuffer: Buffer = Buffer.alloc(0);
    mockBlockBlobClient.uploadStream.mockImplementation(async (stream: NodeJS.ReadableStream) => {
      capturedTarBuffer = await buffer(stream);
    });

    const remoteCacheProvider = new BackfillCacheProvider({
      logger,
      root: monorepo.root,
      cacheOptions: {
        outputGlob: ["lib/**"],
        cacheStorageConfig: { provider: "azure-blob", options: { containerClient: mockContainerClient } },
      },
    });

    const cacheProvider = new RemoteFallbackCacheProvider({
      root: monorepo.root,
      logger,
      localCacheProvider: undefined, // skip local — exercise Azure path exclusively
      remoteCacheProvider,
      writeRemoteCache: true,
    });

    const target = makeTarget(monorepo.root);

    // --- put phase ---
    monorepo.writeFiles({ "packages/a/lib/index.js": "module.exports = {}" });
    await cacheProvider.put("cli-roundtrip-hash", target);
    expect(capturedTarBuffer.length).toBeGreaterThan(0);

    // --- fetch phase ---
    const replayStream = new PassThrough();
    replayStream.end(capturedTarBuffer);
    mockBlobClient.download.mockResolvedValue({ readableStreamBody: replayStream });

    // Remove the output files to simulate a fresh checkout
    fs.rmSync(path.join(monorepo.root, "packages/a/lib"), { recursive: true, force: true });

    const fetchResult = await cacheProvider.fetch("cli-roundtrip-hash", target);

    expect(fetchResult).toBe(true);
    expect(monorepo.readFiles(["packages/a/lib/index.js"])["packages/a/lib/index.js"]).toBe("module.exports = {}");
  });

  it("fetch() local miss → Azure remote hit → returns true", async () => {
    const logger = createLogger();
    monorepo = new Monorepo("cli-azure-fallback");
    await monorepo.init({ packages: { a: {} } });

    const { mockContainerClient, mockBlobClient, mockBlockBlobClient } = makeAzureStorageClientMocks();

    // First, generate a tar via put (using remote-only provider)
    let capturedTarBuffer: Buffer = Buffer.alloc(0);
    mockBlockBlobClient.uploadStream.mockImplementation(async (stream: NodeJS.ReadableStream) => {
      capturedTarBuffer = await buffer(stream);
    });

    const remoteOnlyProvider = new BackfillCacheProvider({
      logger,
      root: monorepo.root,
      cacheOptions: {
        outputGlob: ["lib/**"],
        cacheStorageConfig: { provider: "azure-blob", options: { containerClient: mockContainerClient } },
      },
    });

    const putProvider = new RemoteFallbackCacheProvider({
      root: monorepo.root,
      logger,
      localCacheProvider: undefined,
      remoteCacheProvider: remoteOnlyProvider,
      writeRemoteCache: true,
    });

    const target = makeTarget(monorepo.root);
    monorepo.writeFiles({ "packages/a/lib/index.js": "fallback content" });
    await putProvider.put("cli-fallback-hash", target);

    // Remove files to simulate fresh checkout
    fs.rmSync(path.join(monorepo.root, "packages/a/lib"), { recursive: true, force: true });

    // Now create the real provider hierarchy with BOTH local and remote
    const replayStream = new PassThrough();
    replayStream.end(capturedTarBuffer);
    mockBlobClient.download.mockResolvedValue({ readableStreamBody: replayStream });

    const localCacheProvider = new BackfillCacheProvider({
      logger,
      root: monorepo.root,
      cacheOptions: { outputGlob: ["lib/**"] },
    });

    const remoteCacheProvider = new BackfillCacheProvider({
      logger,
      root: monorepo.root,
      cacheOptions: {
        outputGlob: ["lib/**"],
        cacheStorageConfig: { provider: "azure-blob", options: { containerClient: mockContainerClient } },
      },
    });

    const fetchProvider = new RemoteFallbackCacheProvider({
      root: monorepo.root,
      logger,
      localCacheProvider,
      remoteCacheProvider,
      writeRemoteCache: false,
    });

    const result = await fetchProvider.fetch("cli-fallback-hash", target);

    expect(result).toBe(true);
    expect(monorepo.readFiles(["packages/a/lib/index.js"])["packages/a/lib/index.js"]).toBe("fallback content");
  });
});
