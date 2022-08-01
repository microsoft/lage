import { _testResetEnvHash } from "../src/salt";
import { CacheProvider } from "../src/types/CacheProvider";
import { Logger } from "@lage-run/logger";
import { RemoteFallbackCacheProvider, RemoteFallbackCacheProviderOptions } from "../src/providers/RemoteFallbackCacheProvider";
import path from "path";
import type { Target } from "@lage-run/target-graph";

describe("RemoteFallbackCacheProvider", () => {
  beforeEach(() => {
    _testResetEnvHash();
  });

  it("should fetch from local cache first", async () => {
    const root = "/test";

    const localCacheProvider: CacheProvider = {
      fetch: jest.fn().mockReturnValue(Promise.resolve(true)),
      put: jest.fn(),
      clear: jest.fn(),
      purge: jest.fn(),
    };

    const remoteCacheProvider: CacheProvider = {
      fetch: jest.fn(),
      put: jest.fn(),
      clear: jest.fn(),
      purge: jest.fn(),
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
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = "some-hash";

    await provider.fetch(hash, target);

    expect(localCacheProvider.fetch).toHaveBeenCalled();
    expect(remoteCacheProvider.fetch).not.toHaveBeenCalled();
  });

  it("should fetch from remote cache as fallback", async () => {
    const root = "/test";

    const localCacheProvider: CacheProvider = {
      fetch: jest.fn().mockReturnValue(Promise.resolve(false)),
      put: jest.fn(),
      clear: jest.fn(),
      purge: jest.fn(),
    };

    const remoteCacheProvider: CacheProvider = {
      fetch: jest.fn().mockReturnValue(Promise.resolve(true)),
      put: jest.fn(),
      clear: jest.fn(),
      purge: jest.fn(),
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
      fetch: jest.fn().mockReturnValue(Promise.resolve(true)),
      put: jest.fn(),
      clear: jest.fn(),
      purge: jest.fn(),
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
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = "some-hash";

    await provider.fetch(hash, target);

    expect(remoteCacheProvider.fetch).toHaveBeenCalled();
  });

  it("should fetch from remote cache as fallback", async () => {
    const root = "/test";

    const localCacheProvider: CacheProvider = {
      fetch: jest.fn().mockReturnValue(Promise.resolve(false)),
      put: jest.fn(),
      clear: jest.fn(),
      purge: jest.fn(),
    };

    const remoteCacheProvider: CacheProvider = {
      fetch: jest.fn().mockReturnValue(Promise.resolve(true)),
      put: jest.fn(),
      clear: jest.fn(),
      purge: jest.fn(),
      isReadOnly: true
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
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = "some-hash";

    await provider.put(hash, target);

    expect(localCacheProvider.put).toHaveBeenCalled();
    expect(remoteCacheProvider.put).not.toHaveBeenCalled();
  });

  it("should fetch from remote cache as fallback", async () => {
    const root = "/test";

    const localCacheProvider: CacheProvider = {
      fetch: jest.fn().mockReturnValue(Promise.resolve(false)),
      put: jest.fn(),
      clear: jest.fn(),
      purge: jest.fn(),
      isReadOnly: true
    };

    const remoteCacheProvider: CacheProvider = {
      fetch: jest.fn().mockReturnValue(Promise.resolve(true)),
      put: jest.fn(),
      clear: jest.fn(),
      purge: jest.fn(),
      isReadOnly: true
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
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = "some-hash";

    await provider.put(hash, target);

    expect(localCacheProvider.put).not.toHaveBeenCalled();
    expect(remoteCacheProvider.put).not.toHaveBeenCalled();
  });
});
