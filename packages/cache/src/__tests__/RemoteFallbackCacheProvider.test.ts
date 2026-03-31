import { describe, expect, it, jest } from "@jest/globals";
import { Logger } from "@lage-run/logger";
import type { Target } from "@lage-run/target-graph";
import path from "path";
import { RemoteFallbackCacheProvider } from "../providers/RemoteFallbackCacheProvider.js";
import type { CacheProvider } from "../types/CacheProvider.js";

describe("RemoteFallbackCacheProvider", () => {
  const root = "/test";

  function getMockCacheProvider(fetchResult: boolean): CacheProvider {
    return {
      fetch: jest.fn(() => Promise.resolve(fetchResult)),
      put: jest.fn(() => Promise.resolve(undefined)),
      clear: jest.fn(() => Promise.resolve(undefined)),
      purge: jest.fn(() => Promise.resolve(undefined)),
    };
  }

  function getRemoteFallbackCacheProvider(params: {
    localCacheProvider: CacheProvider;
    remoteCacheProvider: CacheProvider;
  }): RemoteFallbackCacheProvider {
    return new RemoteFallbackCacheProvider({
      root,
      localCacheProvider: params.localCacheProvider,
      remoteCacheProvider: params.remoteCacheProvider,
      logger: new Logger(),
    });
  }

  function getTarget(): Target {
    return {
      id: "a",
      cwd: path.join(root, "packages/a"),
      depSpecs: [],
      dependents: [],
      dependencies: [],
      task: "command",
      label: "a - command",
    };
  }

  it("should fetch from local cache first", async () => {
    const localCacheProvider = getMockCacheProvider(true);
    const remoteCacheProvider = getMockCacheProvider(false);
    const provider = getRemoteFallbackCacheProvider({ localCacheProvider, remoteCacheProvider });

    await provider.fetch("some-hash", getTarget());

    expect(localCacheProvider.fetch).toHaveBeenCalled();
    expect(remoteCacheProvider.fetch).not.toHaveBeenCalled();
  });

  it("should fetch from remote cache as fallback - validating the fetches", async () => {
    const localCacheProvider = getMockCacheProvider(false);
    const remoteCacheProvider = getMockCacheProvider(true);
    const provider = getRemoteFallbackCacheProvider({ localCacheProvider, remoteCacheProvider });

    await provider.fetch("some-hash", getTarget());

    expect(localCacheProvider.fetch).toHaveBeenCalled();
    expect(remoteCacheProvider.fetch).toHaveBeenCalled();
  });

  it("should skip local cache", async () => {
    const remoteCacheProvider = getMockCacheProvider(true);
    const provider = new RemoteFallbackCacheProvider({
      root,
      localCacheProvider: undefined,
      remoteCacheProvider,
      logger: new Logger(),
    });

    await provider.fetch("some-hash", getTarget());

    expect(remoteCacheProvider.fetch).toHaveBeenCalled();
  });

  it("should fetch from remote cache as fallback - validating the puts", async () => {
    const localCacheProvider: CacheProvider = getMockCacheProvider(false);

    const remoteCacheProvider: CacheProvider = getMockCacheProvider(true);
    remoteCacheProvider.isReadOnly = true;

    const provider = getRemoteFallbackCacheProvider({ localCacheProvider, remoteCacheProvider });

    await provider.fetch("some-hash", getTarget());

    expect(remoteCacheProvider.fetch).toHaveBeenCalled();
    expect(localCacheProvider.put).toHaveBeenCalled();
    expect(remoteCacheProvider.put).not.toHaveBeenCalled();
  });

  it("should call the put() method anyway because readonly is enforced inside the underlying cacheProviders", async () => {
    const localCacheProvider = getMockCacheProvider(false);
    localCacheProvider.isReadOnly = true;

    const remoteCacheProvider = getMockCacheProvider(true);
    remoteCacheProvider.isReadOnly = true;

    const provider = getRemoteFallbackCacheProvider({ localCacheProvider, remoteCacheProvider });

    await provider.put("some-hash", getTarget());

    // local fetch is false, do the "put" - but readonly is enforced inside the localCacheProvider
    expect(localCacheProvider.put).toHaveBeenCalled();

    // remote fetch is true, skip the "put"
    expect(remoteCacheProvider.put).not.toHaveBeenCalled();
  });

  it("should not put any local cache if the remote fallback has nothing", async () => {
    const localCacheProvider = getMockCacheProvider(false);
    const remoteCacheProvider = getMockCacheProvider(false);
    const provider = getRemoteFallbackCacheProvider({ localCacheProvider, remoteCacheProvider });

    await provider.fetch("some-hash", getTarget());

    expect(localCacheProvider.fetch).toHaveBeenCalled();
    expect(remoteCacheProvider.fetch).toHaveBeenCalled();
    expect(localCacheProvider.put).not.toHaveBeenCalled();
    expect(remoteCacheProvider.put).not.toHaveBeenCalled();
  });
});
