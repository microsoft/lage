import fs from "fs";
import path from "path";
import { type Logger, makeLogger } from "backfill-logger";
import { createTempDir } from "@lage-run/test-utilities";
import { CacheStorage } from "../CacheStorage.js";

class MockLocalCacheStorage extends CacheStorage {
  public filesToCache: string[] | undefined;
  constructor(logger: Logger, cwd: string) {
    super(logger, cwd, true);
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- match signature
  protected async _fetch(): Promise<boolean> {
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/require-await -- match signature
  protected async _put(_hash: string, filesToCache: string[]): Promise<void> {
    this.filesToCache = filesToCache;
  }
}

let dirCount = 0;

function getTempDir() {
  return createTempDir({ prefix: `test-backfill-cache-${dirCount++}-` });
}

describe("getCacheStorage", () => {
  test("only cache files that have changed", async () => {
    const logger = makeLogger("silly");
    const dir = getTempDir();
    const storage = new MockLocalCacheStorage(logger, dir);

    // makes sure there is no cache interference between tests
    const hash = `${dir}-hash`;

    fs.writeFileSync(path.join(dir, "notChanging"), "not changing content");
    fs.writeFileSync(path.join(dir, "Changing"), "changing content");

    await storage.fetch(hash);

    // Wait 2ms to make sure the file modification time changes.
    // WHY: hashFile uses the file modification time to determine if the hash
    // needs to be recomputed. The filesystems typically used by Mac and Linux
    // record these times at 1ns resolution, but NTFS uses 100ns resolution.
    // So sometimes the test would fail on Windows if it ran too quickly.
    await new Promise((resolve) => setTimeout(resolve, 2));
    fs.writeFileSync(path.join(dir, "Changing"), "changing content now");

    await storage.put(hash, ["**/*"]);

    expect(storage.filesToCache).toEqual(["Changing"]);
  });

  test("caches new files", async () => {
    const logger = makeLogger("silly");
    const dir = getTempDir();
    const storage = new MockLocalCacheStorage(logger, dir);

    // makes sure there is no cache interference between tests
    const hash = `${dir}-hash`;

    fs.writeFileSync(path.join(dir, "notChanging"), "not changing content");

    await storage.fetch(hash);

    fs.writeFileSync(path.join(dir, "new"), "new content");

    await storage.put(hash, ["**/*"]);

    expect(storage.filesToCache).toEqual(["new"]);
  });

  test("does not cache file re-written", async () => {
    const logger = makeLogger("silly");
    const dir = getTempDir();
    const storage = new MockLocalCacheStorage(logger, dir);

    // makes sure there is no cache interference between tests
    const hash = `${dir}-hash`;

    fs.writeFileSync(path.join(dir, "notChanging"), "not changing content");

    await storage.fetch(hash);

    fs.writeFileSync(path.join(dir, "notChanging"), "not changing content");

    await storage.put(hash, ["**/*"]);

    expect(storage.filesToCache).toEqual([]);
  });

  test("caches dotfiles in subdirectories matched by outputGlob", async () => {
    const logger = makeLogger("silly");
    const dir = getTempDir();
    const storage = new MockLocalCacheStorage(logger, dir);

    const hash = `${dir}-dotfile-hash`;

    await storage.fetch(hash);

    // Create output with a dotfolder (like .vite/manifest.json)
    fs.mkdirSync(path.join(dir, "dist", "public", ".vite"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(dir, "dist", "public", ".vite", "manifest.json"),
      "{}"
    );
    fs.writeFileSync(path.join(dir, "dist", "public", "index.html"), "<html/>");

    await storage.put(hash, ["dist/**/*"]);

    // Both the regular file and the dotfile should be cached
    expect(storage.filesToCache).toEqual(
      expect.arrayContaining([
        "dist/public/.vite/manifest.json",
        "dist/public/index.html",
      ])
    );
  });

  test("caches dotfiles when outputGlob uses **/*", async () => {
    const logger = makeLogger("silly");
    const dir = getTempDir();
    const storage = new MockLocalCacheStorage(logger, dir);

    const hash = `${dir}-dotfile2-hash`;

    await storage.fetch(hash);

    // Create a dotfile directly
    fs.writeFileSync(path.join(dir, ".env"), "SECRET=123");
    fs.writeFileSync(path.join(dir, "index.js"), "module.exports = {}");

    await storage.put(hash, ["**/*"]);

    expect(storage.filesToCache).toEqual(
      expect.arrayContaining([".env", "index.js"])
    );
  });
});
