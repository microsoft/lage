import path from "path";
import fs from "fs";
import os from "os";
import { makeLogger } from "backfill-logger";
import { getCacheStorageProvider } from "../getCacheStorageProvider.js";
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

  test("can get a custom storage provider via plugin", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "backfill-test-"));
    const pluginPath = path.join(tmpDir, "mock-plugin.js");

    fs.writeFileSync(
      pluginPath,
      `module.exports = { default: { name: "mock", getProvider: () => ({ fetch: () => Promise.resolve(true), put: () => Promise.resolve() }) } };`
    );

    try {
      const provider = getCacheStorageProvider(
        {
          provider: "custom",
          plugin: pluginPath,
          options: {},
        },
        "test",
        makeLogger("silly"),
        "cwd"
      );

      expect(provider.fetch).toBeTruthy();
      expect(provider.put).toBeTruthy();
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });
});
