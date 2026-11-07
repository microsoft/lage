import { describe, expect, it, jest } from "@jest/globals";
import { Logger } from "@lage-run/logger";
import type { Target } from "@lage-run/target-graph";
import path from "path";
import { RemoteFallbackCacheProvider, type RemoteFallbackCacheProviderOptions } from "../providers/RemoteFallbackCacheProvider.js";
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

  function getRemoteFallbackCacheProvider(
    params: Pick<RemoteFallbackCacheProviderOptions, "localCacheProvider" | "remoteCacheProvider" | "writeRemoteCache">
  ): RemoteFallbackCacheProvider {
    return new RemoteFallbackCacheProvider({
      root,
      ...params,
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

    const provider = getRemoteFallbackCacheProvider({ localCacheProvider, remoteCacheProvider, writeRemoteCache: true });
    const target = getTarget();

    await provider.fetch("read-only-provider", target);
    jest.mocked(localCacheProvider.put).mockClear();
    await provider.put("read-only-provider", target);

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

  it.each([
    {
      name: "should read and write only the local provider when no remote is configured",
      localEnabled: true,
      remoteEnabled: false,
      writeRemoteCache: undefined,
      skipRemoteCache: false,
      localWrites: 1,
      remoteWrites: 0,
    },
    {
      name: "should read from the remote but not write to it by default",
      localEnabled: true,
      remoteEnabled: true,
      writeRemoteCache: undefined,
      skipRemoteCache: false,
      localWrites: 1,
      remoteWrites: 0,
    },
    {
      name: "should not write to the remote when explicitly disabled",
      localEnabled: true,
      remoteEnabled: true,
      writeRemoteCache: false,
      skipRemoteCache: false,
      localWrites: 1,
      remoteWrites: 0,
    },
    {
      name: "should write to both providers when remote writes are enabled",
      localEnabled: true,
      remoteEnabled: true,
      writeRemoteCache: true,
      skipRemoteCache: false,
      localWrites: 1,
      remoteWrites: 1,
    },
    {
      name: "should read and write only the remote provider when local caching is skipped",
      localEnabled: false,
      remoteEnabled: true,
      writeRemoteCache: true,
      skipRemoteCache: false,
      localWrites: 0,
      remoteWrites: 1,
    },
    {
      name: "should not write to either provider when local caching is skipped and remote writes are disabled",
      localEnabled: false,
      remoteEnabled: true,
      writeRemoteCache: false,
      skipRemoteCache: false,
      localWrites: 0,
      remoteWrites: 0,
    },
    {
      name: "should skip remote reads and writes for a target even when remote writes are enabled",
      localEnabled: true,
      remoteEnabled: true,
      writeRemoteCache: true,
      skipRemoteCache: true,
      localWrites: 1,
      remoteWrites: 0,
    },
  ])("$name", async ({ name, localEnabled, remoteEnabled, writeRemoteCache, skipRemoteCache, localWrites, remoteWrites }) => {
    const localCacheProvider = getMockCacheProvider(false);
    const remoteCacheProvider = getMockCacheProvider(false);
    const provider = getRemoteFallbackCacheProvider({
      localCacheProvider: localEnabled ? localCacheProvider : undefined,
      remoteCacheProvider: remoteEnabled ? remoteCacheProvider : undefined,
      writeRemoteCache,
    });
    const target = { ...getTarget(), skipRemoteCache };
    const hash = `policy-${name}`;

    expect(await provider.fetch(hash, target)).toBe(false);
    expect(localCacheProvider.put).not.toHaveBeenCalled();
    expect(remoteCacheProvider.put).not.toHaveBeenCalled();

    await provider.put(hash, target);

    expect(localCacheProvider.fetch).toHaveBeenCalledTimes(localEnabled ? 1 : 0);
    expect(remoteCacheProvider.fetch).toHaveBeenCalledTimes(remoteEnabled && !skipRemoteCache ? 1 : 0);
    expect(localCacheProvider.put).toHaveBeenCalledTimes(localWrites);
    expect(remoteCacheProvider.put).toHaveBeenCalledTimes(remoteWrites);
  });
});
