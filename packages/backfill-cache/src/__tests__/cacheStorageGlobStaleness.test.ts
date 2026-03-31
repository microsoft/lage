import { describe, expect, test } from "@jest/globals";
import fs from "fs";
import path from "path";
import { makeLogger } from "backfill-logger";
import { createTempDir } from "@lage-run/test-utilities";
import { CacheStorage } from "../CacheStorage.js";
import type { Logger } from "backfill-logger";

/**
 * A mock CacheStorage that records which files were passed to _put().
 */
class RecordingCacheStorage extends CacheStorage {
  public filesToCache: string[] | undefined;

  constructor(logger: Logger, cwd: string, incrementalCaching = false) {
    super(logger, cwd, incrementalCaching);
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
function getTempDir(): string {
  return createTempDir({ prefix: `test-glob-staleness-${dirCount++}-` });
}

describe("CacheStorage glob staleness", () => {
  test("put() sees new files even when same outputGlob+cwd was globbed before", async () => {
    // This simulates a regression lage had once: in lage's worker pool, a worker thread
    // handles multiple tasks sequentially. If two tasks share the same
    // outputGlob and cwd (e.g. a transpile and preTranspile step),
    // the second put() must see the new files — not a stale cached result
    // from the first put().
    const logger = makeLogger("silly");
    const dir = getTempDir();
    const libDir = path.join(dir, "lib");
    fs.mkdirSync(libDir);

    const storage = new RecordingCacheStorage(logger, dir);

    // Task 1: produces one output file, then put() globs lib/**
    fs.writeFileSync(path.join(libDir, "a.js"), "export const a = 1;");
    await storage.put("hash-1", ["lib/**"]);
    expect(storage.filesToCache).toEqual(["lib/a.js"]);

    // Task 2: produces an additional output file in the same directory
    fs.writeFileSync(path.join(libDir, "b.js"), "export const b = 2;");
    await storage.put("hash-2", ["lib/**"]);

    // With the old cached globAsync the second put() returned ["lib/a.js"]
    // (stale from task 1). With globAsyncUncached it returns both files.
    expect(storage.filesToCache).toHaveLength(2);
    expect(storage.filesToCache).toEqual(
      expect.arrayContaining(["lib/a.js", "lib/b.js"])
    );
  });

  test("incremental: sequential tasks cache only the correct changed files", async () => {
    // With incrementalCaching, fetch() snapshots file hashes and put() diffs
    // against that snapshot.  When two tasks run sequentially on the same
    // package (same cwd + same outputGlob), the second put() must see fresh
    // file listings for both the outputGlob and the getHashesFor() snapshot.
    //
    // With cached glob this goes wrong:
    //   - outputGlob returns stale results (task 1's files)
    //   - getHashesFor returns stale snapshot (empty dir)
    //   → second put() caches task 1's file instead of task 2's new file
    const logger = makeLogger("silly");
    const dir = getTempDir();
    const libDir = path.join(dir, "lib");
    fs.mkdirSync(libDir);

    const storage = new RecordingCacheStorage(
      logger,
      dir,
      /* incrementalCaching */ true
    );

    // Task 1: fetch (miss) → build produces lib/a.js → put
    await storage.fetch("hash-1");
    fs.writeFileSync(path.join(libDir, "a.js"), "export const a = 1;");
    await storage.put("hash-1", ["lib/**"]);
    expect(storage.filesToCache).toEqual(["lib/a.js"]);

    // Task 2: fetch (miss) → build produces lib/b.js → put (same outputGlob)
    await storage.fetch("hash-2");
    fs.writeFileSync(path.join(libDir, "b.js"), "export const b = 2;");
    await storage.put("hash-2", ["lib/**"]);

    // With cached glob the second put() returns ["lib/a.js"] (stale outputGlob)
    // and the incremental diff has an empty baseline (stale getHashesFor), so
    // it caches the wrong file. With uncached glob it correctly caches only b.js.
    expect(storage.filesToCache).toContain("lib/b.js");
  });
});
