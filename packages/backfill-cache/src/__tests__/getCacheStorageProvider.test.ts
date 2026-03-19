import { type Logger, makeLogger } from "backfill-logger";
import { getCacheStorageProvider } from "../getCacheStorageProvider.js";
import type { ICacheStorage } from "../CacheStorage.js";
import { LocalCacheStorage } from "../LocalCacheStorage.js";

describe("getCacheStorageProvider", () => {
  test("cache provider is memoized by provider, cacheFolder and cwd", () => {
    const p1 = getCacheStorageProvider(
      {
        provider: "local-skip",
      },
      "test",
      makeLogger("silly"),
      "cwd"
    );
    const p2 = getCacheStorageProvider(
      {
        provider: "local",
      },
      "test",
      makeLogger("silly"),
      "cwd"
    );
    const p3 = getCacheStorageProvider(
      {
        provider: "local-skip",
      },
      "test",
      makeLogger("silly"),
      "cwd2"
    );
    const p4 = getCacheStorageProvider(
      {
        provider: "local-skip",
      },
      "test",
      makeLogger("silly"),
      "cwd"
    );
    const p5 = getCacheStorageProvider(
      {
        provider: "local-skip",
      },
      "test2",
      makeLogger("silly"),
      "cwd"
    );

    expect(p1).toEqual(p4);
    expect(p1).not.toEqual(p2);
    expect(p1).not.toEqual(p3);
    expect(p1).not.toEqual(p5);
  });
  test("can get a local storage provider", () => {
    const provider = getCacheStorageProvider(
      {
        provider: "local",
      },
      "test",
      makeLogger("silly"),
      "cwd"
    );

    expect(provider instanceof LocalCacheStorage).toBeTruthy();
  });

  test("can get a custom storage provider as a class", () => {
    const TestProvider = class implements ICacheStorage {
      constructor(
        private logger: Logger,
        private cwd: string
      ) {}

      public fetch(hash: string) {
        this.logger.silly(`fetching ${this.cwd} ${hash}`);
        return Promise.resolve(true);
      }

      public put(hash: string, filesToCache: string[]) {
        this.logger.silly(
          `putting ${this.cwd} ${hash} ${filesToCache.length} files`
        );
        return Promise.resolve();
      }
    };

    const provider = getCacheStorageProvider(
      {
        provider: (logger, cwd) => new TestProvider(logger, cwd),
        name: "test-provider",
      },
      "test",
      makeLogger("silly"),
      "cwd"
    );

    expect(provider.fetch).toBeTruthy();
    expect(provider.put).toBeTruthy();
  });

  test("throws when custom plugin cannot be loaded", () => {
    expect(() =>
      getCacheStorageProvider(
        {
          provider: "custom",
          plugin: "nonexistent-plugin-package",
          options: {},
        },
        "test",
        makeLogger("silly"),
        "cwd"
      )
    ).toThrow('Failed to load custom cache storage plugin "nonexistent-plugin-package"');
  });
});
