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
});
