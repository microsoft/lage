import { describe, expect, it, jest } from "@jest/globals";
import { Logger } from "@lage-run/logger";
import type { Target } from "@lage-run/target-graph";
import path from "path";
import { RemoteFallbackCacheProvider, type RemoteFallbackCacheProviderOptions } from "../providers/RemoteFallbackCacheProvider.js";
import type { CacheProvider } from "../types/CacheProvider.js";

describe("RemoteFallbackCacheProvider", () => {
  it("should fetch from local cache first", async () => {
    const root = "/test";

    const localCacheProvider: CacheProvider = {
      fetch: jest.fn<CacheProvider["fetch"]>().mockReturnValue(Promise.resolve(true)),
      put: jest.fn<CacheProvider["put"]>(),
      clear: jest.fn<CacheProvider["clear"]>(),
      purge: jest.fn<CacheProvider["purge"]>(),
    };

    const remoteCacheProvider: CacheProvider = {
      fetch: jest.fn<CacheProvider["fetch"]>(),
      put: jest.fn<CacheProvider["put"]>(),
      clear: jest.fn<CacheProvider["clear"]>(),
      purge: jest.fn<CacheProvider["purge"]>(),
    };

    const options: RemoteFallbackCacheProviderOptions = {
      root,
      localCacheProvider,
      remoteCacheProvider,
      logger: new Logger(),
    };

    const provider = new RemoteFallbackCacheProvider(options);

    const target: Target = {
      id: "a",
      cwd: path.join(root, "packages/a"),
      depSpecs: [],
      dependents: [],
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = "some-hash";

    await provider.fetch(hash, target);

    expect(localCacheProvider.fetch).toHaveBeenCalled();
    expect(remoteCacheProvider.fetch).not.toHaveBeenCalled();
  });

  it("should fetch from remote cache as fallback - validating the fetches", async () => {
    const root = "/test";

    const localCacheProvider: CacheProvider = {
      fetch: jest.fn<CacheProvider["fetch"]>().mockReturnValue(Promise.resolve(false)),
      put: jest.fn<CacheProvider["put"]>(),
      clear: jest.fn<CacheProvider["clear"]>(),
      purge: jest.fn<CacheProvider["purge"]>(),
    };

    const remoteCacheProvider: CacheProvider = {
      fetch: jest.fn<CacheProvider["fetch"]>().mockReturnValue(Promise.resolve(true)),
      put: jest.fn<CacheProvider["put"]>(),
      clear: jest.fn<CacheProvider["clear"]>(),
      purge: jest.fn<CacheProvider["purge"]>(),
    };

    const options: RemoteFallbackCacheProviderOptions = {
      root,
      localCacheProvider,
      remoteCacheProvider,
      logger: new Logger(),
    };

    const provider = new RemoteFallbackCacheProvider(options);

    const target: Target = {
      id: "a",
      cwd: path.join(root, "packages/a"),
      depSpecs: [],
      dependents: [],
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = "some-hash";

    await provider.fetch(hash, target);

    expect(localCacheProvider.fetch).toHaveBeenCalled();
    expect(remoteCacheProvider.fetch).toHaveBeenCalled();
  });

  it("should skip local cache", async () => {
    const root = "/test";

    const remoteCacheProvider: CacheProvider = {
      fetch: jest.fn<CacheProvider["fetch"]>().mockReturnValue(Promise.resolve(true)),
      put: jest.fn<CacheProvider["put"]>(),
      clear: jest.fn<CacheProvider["clear"]>(),
      purge: jest.fn<CacheProvider["purge"]>(),
    };

    const options: RemoteFallbackCacheProviderOptions = {
      root,
      localCacheProvider: undefined,
      remoteCacheProvider,
      logger: new Logger(),
    };

    const provider = new RemoteFallbackCacheProvider(options);

    const target: Target = {
      id: "a",
      cwd: path.join(root, "packages/a"),
      depSpecs: [],
      dependents: [],
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = "some-hash";

    await provider.fetch(hash, target);

    expect(remoteCacheProvider.fetch).toHaveBeenCalled();
  });

  it("should fetch from remote cache as fallback - validating the puts", async () => {
    const root = "/test";

    const localCacheProvider: CacheProvider = {
      fetch: jest.fn<CacheProvider["fetch"]>().mockReturnValue(Promise.resolve(false)),
      put: jest.fn<CacheProvider["put"]>(),
      clear: jest.fn<CacheProvider["clear"]>(),
      purge: jest.fn<CacheProvider["purge"]>(),
    };

    const remoteCacheProvider: CacheProvider = {
      fetch: jest.fn<CacheProvider["fetch"]>().mockReturnValue(Promise.resolve(true)),
      put: jest.fn<CacheProvider["put"]>(),
      clear: jest.fn<CacheProvider["clear"]>(),
      purge: jest.fn<CacheProvider["purge"]>(),
      isReadOnly: true,
    };

    const options: RemoteFallbackCacheProviderOptions = {
      root,
      localCacheProvider,
      remoteCacheProvider,
      logger: new Logger(),
    };

    const provider = new RemoteFallbackCacheProvider(options);

    const target: Target = {
      id: "a",
      cwd: path.join(root, "packages/a"),
      depSpecs: [],
      dependents: [],
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = "some-hash";

    await provider.fetch(hash, target);

    expect(remoteCacheProvider.fetch).toHaveBeenCalled();
    expect(localCacheProvider.put).toHaveBeenCalled();
    expect(remoteCacheProvider.put).not.toHaveBeenCalled();
  });

  it("should call the put() method anyway because readonly is enforced inside the underlying cacheProviders", async () => {
    const root = "/test";

    const localCacheProvider: CacheProvider = {
      fetch: jest.fn<CacheProvider["fetch"]>().mockReturnValue(Promise.resolve(false)),
      put: jest.fn<CacheProvider["put"]>(),
      clear: jest.fn<CacheProvider["clear"]>(),
      purge: jest.fn<CacheProvider["purge"]>(),
      isReadOnly: true,
    };

    const remoteCacheProvider: CacheProvider = {
      fetch: jest.fn<CacheProvider["fetch"]>().mockReturnValue(Promise.resolve(true)),
      put: jest.fn<CacheProvider["put"]>(),
      clear: jest.fn<CacheProvider["clear"]>(),
      purge: jest.fn<CacheProvider["purge"]>(),
      isReadOnly: true,
    };

    const options: RemoteFallbackCacheProviderOptions = {
      root,
      localCacheProvider,
      remoteCacheProvider,
      logger: new Logger(),
    };

    const provider = new RemoteFallbackCacheProvider(options);

    const target: Target = {
      id: "a",
      cwd: path.join(root, "packages/a"),
      depSpecs: [],
      dependents: [],
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = "some-hash";

    await provider.put(hash, target);

    // local fetch is false, do the "put" - but readonly is enforced inside the localCacheProvider
    expect(localCacheProvider.put).toHaveBeenCalled();

    // remote fetch is true, skip the "put"
    expect(remoteCacheProvider.put).not.toHaveBeenCalled();
  });

  it("should not put any local cache if the remote fallback has nothing", async () => {
    const root = "/test";

    const localCacheProvider: CacheProvider = {
      fetch: jest.fn<CacheProvider["fetch"]>().mockReturnValue(Promise.resolve(false)),
      put: jest.fn<CacheProvider["put"]>(),
      clear: jest.fn<CacheProvider["clear"]>(),
      purge: jest.fn<CacheProvider["purge"]>(),
    };

    const remoteCacheProvider: CacheProvider = {
      fetch: jest.fn<CacheProvider["fetch"]>().mockReturnValue(Promise.resolve(false)),
      put: jest.fn<CacheProvider["put"]>(),
      clear: jest.fn<CacheProvider["clear"]>(),
      purge: jest.fn<CacheProvider["purge"]>(),
    };

    const options: RemoteFallbackCacheProviderOptions = {
      root,
      localCacheProvider,
      remoteCacheProvider,
      logger: new Logger(),
    };

    const provider = new RemoteFallbackCacheProvider(options);

    const target: Target = {
      id: "a",
      cwd: path.join(root, "packages/a"),
      depSpecs: [],
      dependents: [],
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = "some-hash";

    await provider.fetch(hash, target);

    expect(localCacheProvider.fetch).toHaveBeenCalled();
    expect(remoteCacheProvider.fetch).toHaveBeenCalled();
    expect(localCacheProvider.put).not.toHaveBeenCalled();
    expect(remoteCacheProvider.put).not.toHaveBeenCalled();
  });
});
