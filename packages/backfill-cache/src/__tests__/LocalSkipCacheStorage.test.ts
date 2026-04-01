import { describe, expect, it, beforeEach } from "@jest/globals";
import path from "path";
import fs from "fs-extra";
import { makeLogger } from "backfill-logger";
import { createTempDir } from "@lage-run/test-utilities";
import { LocalSkipCacheStorage } from "../LocalSkipCacheStorage.js";

describe("LocalSkipCacheStorage", () => {
  let cwd: string;
  const internalCacheFolder = "node_modules/.cache/backfill";

  beforeEach(() => {
    cwd = createTempDir({ prefix: "test-local-skip-" });
  });

  it("fetch returns false when no hash file exists", async () => {
    const storage = new LocalSkipCacheStorage(
      internalCacheFolder,
      makeLogger("mute"),
      cwd
    );
    const result = await storage.fetch("some-hash");
    expect(result).toBe(false);
  });

  it("put stores the hash, then fetch returns true for matching hash", async () => {
    const storage = new LocalSkipCacheStorage(
      internalCacheFolder,
      makeLogger("mute"),
      cwd
    );

    await storage.put("my-hash", ["lib/**"]);

    const result = await storage.fetch("my-hash");
    expect(result).toBe(true);
  });

  it("fetch returns false for a different hash after put", async () => {
    const storage = new LocalSkipCacheStorage(
      internalCacheFolder,
      makeLogger("mute"),
      cwd
    );

    await storage.put("hash-a", ["lib/**"]);

    const result = await storage.fetch("hash-b");
    expect(result).toBe(false);
  });

  it("put overwrites the previous hash", async () => {
    const storage = new LocalSkipCacheStorage(
      internalCacheFolder,
      makeLogger("mute"),
      cwd
    );

    await storage.put("old-hash", ["lib/**"]);
    await storage.put("new-hash", ["lib/**"]);

    expect(await storage.fetch("old-hash")).toBe(false);
    expect(await storage.fetch("new-hash")).toBe(true);
  });

  it("stores the hash file in the expected location", async () => {
    const storage = new LocalSkipCacheStorage(
      internalCacheFolder,
      makeLogger("mute"),
      cwd
    );

    await storage.put("location-hash", ["lib/**"]);

    const hashFile = path.join(cwd, internalCacheFolder, "skip-cache", "hash");
    expect(fs.existsSync(hashFile)).toBe(true);
    expect(fs.readFileSync(hashFile, "utf-8")).toBe("location-hash");
  });
});
