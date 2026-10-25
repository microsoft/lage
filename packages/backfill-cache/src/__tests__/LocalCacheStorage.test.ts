import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
  createTempDir,
  removeTempDirAsync,
  setupFixture,
  type FixtureName,
} from "@lage-run/test-utilities";
import { makeLogger } from "backfill-logger";
import fs from "fs-extra";
import { promises as fsPromises } from "fs";
import path from "path";
import { LocalCacheStorage } from "../LocalCacheStorage.js";
import { getCacheStorageProvider } from "../getCacheStorageProvider.js";

/**
 * Create the fixture files and get the `LocalCacheStorage` instance.
 * If `fixtureLocation` is provided, it will be reused instead of creating a new fixture directory.
 */
const setupCacheStorage = (
  fixtureName: FixtureName,
  fixtureLocation?: string
) => {
  fixtureLocation ??= setupFixture(fixtureName);

  const internalCacheFolder = path.join("node_modules", ".cache", "backfill");
  const logger = makeLogger("mute");

  const cacheStorage = getCacheStorageProvider(
    { provider: "local" },
    internalCacheFolder,
    logger,
    fixtureLocation
  );
  expect(cacheStorage).toBeInstanceOf(LocalCacheStorage);

  return { cacheStorage, internalCacheFolder, fixtureLocation };
};

type CacheTestCase = {
  fixtureName: FixtureName;
  /** If provided, use this instead of creating a new fixture directory */
  fixtureLocation?: string;
  hash: string;
};

async function fetchFromCache(
  params: CacheTestCase & { expectFailure?: boolean }
) {
  const { fixtureName, hash, expectFailure } = params;
  const { cacheStorage, internalCacheFolder, fixtureLocation } =
    setupCacheStorage(fixtureName, params.fixtureLocation);
  const expectSuccess = !expectFailure;

  const secretFile = "qwerty";

  if (expectSuccess) {
    fs.outputFileSync(
      path.join(fixtureLocation, internalCacheFolder, hash, secretFile),
      ""
    );
  }

  const fetchResult = await cacheStorage.fetch(hash);
  expect(fetchResult).toBe(expectSuccess);

  expect(fs.existsSync(path.join(fixtureLocation, secretFile))).toBe(
    expectSuccess
  );
}

async function putInCache(
  params: CacheTestCase & { outputGlob: string[]; filesToCache: string[] }
) {
  const { fixtureName, outputGlob, filesToCache, hash } = params;
  const { cacheStorage, internalCacheFolder, fixtureLocation } =
    setupCacheStorage(fixtureName, params.fixtureLocation);

  if (!outputGlob) {
    throw new Error("outputGlob should be provided to the putInCache function");
  }

  if (!filesToCache) {
    throw new Error(
      "filesToCache should be provided to the putInCache function"
    );
  }

  // This forces collection of the hashes before we change the files
  await cacheStorage.fetch(hash);

  for (const f of filesToCache) {
    fs.outputFileSync(path.join(fixtureLocation, f), "");
  }

  await cacheStorage.put(hash, outputGlob);

  for (const f of filesToCache) {
    const pathToCheck = path.join(internalCacheFolder, hash, f);

    expect(fs.existsSync(path.join(fixtureLocation, pathToCheck))).toBe(true);
  }

  for (const f of filesToCache) {
    fs.removeSync(path.join(fixtureLocation, f));
    expect(fs.existsSync(path.join(fixtureLocation, f))).toBe(false);
    await cacheStorage.fetch(hash);
    expect(fs.existsSync(path.join(fixtureLocation, f))).toBe(true);
  }
}

describe("LocalCacheStorage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("materialized outputs", () => {
    let tempDir: string | undefined;

    afterEach(async () => {
      const dir = tempDir;
      tempDir = undefined;
      await removeTempDirAsync(dir, { throwOnError: true, maxAttempts: 3 });
    });

    function setupOutputs() {
      tempDir = createTempDir({ prefix: "backfill-outputs-" });
      const fixtureLocation = tempDir;
      const internalCacheFolder = path.join(
        "node_modules",
        ".cache",
        "backfill"
      );
      const cacheStorage = new LocalCacheStorage(
        internalCacheFolder,
        makeLogger("mute"),
        fixtureLocation
      );
      const hash = "materialized-outputs";
      const cacheFolder = path.join(fixtureLocation, internalCacheFolder, hash);
      const outputFile = path.join(fixtureLocation, "lib", "index.js");
      fs.outputFileSync(outputFile, "original");
      return {
        fixtureLocation,
        internalCacheFolder,
        cacheStorage,
        hash,
        cacheFolder,
        outputFile,
      };
    }

    it("validates across storage instances without rewriting outputs or metadata", async () => {
      const { fixtureLocation, internalCacheFolder, cacheStorage, hash } =
        setupOutputs();
      await cacheStorage.put(hash, ["lib/**"]);
      const freshStorage = new LocalCacheStorage(
        internalCacheFolder,
        makeLogger("mute"),
        fixtureLocation
      );
      const copy = jest.spyOn(fsPromises, "copyFile");
      const write = jest.spyOn(fs, "writeFile");
      const rename = jest.spyOn(fs, "rename");

      expect(await freshStorage.isUpToDate(hash)).toBe(true);
      expect(await freshStorage.fetch(hash)).toBe(true);
      expect(copy).not.toHaveBeenCalled();
      expect(write).not.toHaveBeenCalled();
      expect(rename).not.toHaveBeenCalled();
    });

    it("rejects and restores a same-size edit even when its mtime is preserved", async () => {
      const { cacheStorage, hash, outputFile } = setupOutputs();
      const timestamp = new Date("2020-01-01T00:00:00Z");
      await fs.utimes(outputFile, timestamp, timestamp);
      await cacheStorage.put(hash, ["lib/**"]);
      await fs.writeFile(outputFile, "modified");
      await fs.utimes(outputFile, timestamp, timestamp);

      expect(await cacheStorage.isUpToDate(hash)).toBe(false);
      expect(await fs.readFile(outputFile, "utf8")).toBe("modified");
      expect(await cacheStorage.fetch(hash)).toBe(true);
      expect(await fs.readFile(outputFile, "utf8")).toBe("original");
      expect(await cacheStorage.isUpToDate(hash)).toBe(true);
    });

    it("restores only deleted outputs, leaving intact outputs untouched", async () => {
      const { cacheStorage, hash, outputFile, fixtureLocation } =
        setupOutputs();
      const intactFile = path.join(
        fixtureLocation,
        "lib",
        "nested",
        ".manifest"
      );
      await fs.outputFile(intactFile, "intact");
      await cacheStorage.put(hash, ["lib/**"]);
      const intactBefore = await fs.stat(intactFile);
      await fs.remove(outputFile);
      const copy = jest.spyOn(fsPromises, "copyFile");

      expect(await cacheStorage.isUpToDate(hash)).toBe(false);
      expect(await fs.pathExists(outputFile)).toBe(false);
      expect(await cacheStorage.fetch(hash)).toBe(true);
      expect(await fs.readFile(outputFile, "utf8")).toBe("original");
      expect((await fs.stat(intactFile)).mtimeMs).toBe(intactBefore.mtimeMs);
      expect(copy).toHaveBeenCalledTimes(1);
      expect(await cacheStorage.isUpToDate(hash)).toBe(true);
    });

    it("restores deleted output directories and replaced files", async () => {
      const { cacheStorage, hash, outputFile } = setupOutputs();
      await cacheStorage.put(hash, ["lib/**"]);
      await fs.remove(path.dirname(outputFile));
      expect(await cacheStorage.isUpToDate(hash)).toBe(false);
      expect(await cacheStorage.fetch(hash)).toBe(true);
      await fs.remove(outputFile);
      await fs.outputFile(outputFile, "replaced");
      expect(await cacheStorage.isUpToDate(hash)).toBe(false);
      expect(await cacheStorage.fetch(hash)).toBe(true);
      expect(await fs.readFile(outputFile, "utf8")).toBe("original");
    });

    it("verifies legacy entries before using the validation-only shortcut", async () => {
      const { cacheStorage, hash, outputFile, cacheFolder } = setupOutputs();
      await fs.outputFile(path.join(cacheFolder, "lib", "index.js"), "cached");
      expect(await cacheStorage.isUpToDate(hash)).toBe(false);
      expect(await fs.readFile(outputFile, "utf8")).toBe("original");
      expect(await cacheStorage.fetch(hash)).toBe(true);
      expect(await fs.readFile(outputFile, "utf8")).toBe("cached");
      expect(await cacheStorage.isUpToDate(hash)).toBe(true);
      expect(await fs.readdir(cacheFolder)).toEqual(["lib"]);
    });

    it.each([
      "{broken",
      "null",
      "{}",
      '{"version":99}',
      '{"version":1,"files":[]}',
    ])(
      "safely refreshes missing or invalid output metadata: %s",
      async (metadata) => {
        const { cacheStorage, hash, cacheFolder } = setupOutputs();
        await cacheStorage.put(hash, ["lib/**"]);
        await fs.writeFile(`${cacheFolder}.state.json`, metadata);
        expect(await cacheStorage.isUpToDate(hash)).toBe(false);
        expect(await cacheStorage.fetch(hash)).toBe(true);
        expect(await cacheStorage.isUpToDate(hash)).toBe(true);
      }
    );

    it("does not trust metadata for a removed or replaced cache directory", async () => {
      const { cacheStorage, hash, cacheFolder } = setupOutputs();
      await cacheStorage.put(hash, ["lib/**"]);
      await fs.remove(cacheFolder);
      expect(await cacheStorage.isUpToDate(hash)).toBe(false);
      await fs.outputFile(
        path.join(cacheFolder, "lib", "index.js"),
        "replaced"
      );
      expect(await cacheStorage.isUpToDate(hash)).toBe(false);
      expect(await cacheStorage.fetch(hash)).toBe(true);
      expect(await cacheStorage.isUpToDate(hash)).toBe(true);
    });

    it("checks modified cached files on the normal fetch path", async () => {
      const { cacheStorage, hash, cacheFolder, outputFile } = setupOutputs();
      await cacheStorage.put(hash, ["lib/**"]);
      await fs.writeFile(path.join(cacheFolder, "lib", "index.js"), "changed");
      expect(await cacheStorage.fetch(hash)).toBe(true);
      expect(await fs.readFile(outputFile, "utf8")).toBe("changed");
    });

    it("supports cache entries with no outputs", async () => {
      const { cacheStorage, hash } = setupOutputs();
      await cacheStorage.put(hash, ["missing/**"]);
      expect(await cacheStorage.isUpToDate(hash)).toBe(true);
      expect(await cacheStorage.fetch(hash)).toBe(true);
    });

    it("validates every output across multiple stat batches", async () => {
      const { cacheStorage, hash, outputFile } = setupOutputs();
      const outputs = Array.from({ length: 300 }, (_, index) =>
        path.join(path.dirname(outputFile), `${index}.js`)
      );
      await Promise.all(outputs.map((file) => fs.writeFile(file, "output")));
      await cacheStorage.put(hash, ["lib/**"]);
      expect(await cacheStorage.isUpToDate(hash)).toBe(true);

      await fs.remove(outputs[outputs.length - 1]);
      expect(await cacheStorage.isUpToDate(hash)).toBe(false);
      expect(await cacheStorage.fetch(hash)).toBe(true);
      expect(await cacheStorage.isUpToDate(hash)).toBe(true);
    });

    it("rejects malformed file proofs and paths outside the output root", async () => {
      const { cacheStorage, hash, cacheFolder } = setupOutputs();
      await cacheStorage.put(hash, ["lib/**"]);
      const stateFile = `${cacheFolder}.state.json`;
      const state = await fs.readJSON(stateFile);
      const proof = state.files["lib/index.js"];
      for (const file of [
        "../outside",
        "..\\outside",
        "/outside",
        "C:outside",
        "lib/index.js\0",
      ]) {
        await fs.writeJSON(stateFile, {
          ...state,
          files: { [file]: proof },
        });
        expect(await cacheStorage.isUpToDate(hash)).toBe(false);
      }
      await fs.writeJSON(stateFile, {
        ...state,
        files: { "lib/index.js": {} },
      });
      expect(await cacheStorage.isUpToDate(hash)).toBe(false);
    });

    it("publishes an entry only after every output has been copied", async () => {
      const { cacheStorage, hash } = setupOutputs();
      const copyFile = fsPromises.copyFile;
      let startCopy!: () => void;
      let finishCopy!: () => void;
      const started = new Promise<void>((resolve) => {
        startCopy = resolve;
      });
      const finish = new Promise<void>((resolve) => {
        finishCopy = resolve;
      });
      jest
        .spyOn(fsPromises, "copyFile")
        .mockImplementationOnce(async (src, dest) => {
          startCopy();
          await finish;
          await copyFile(src, dest);
        });

      const pending = cacheStorage.put(hash, ["lib/**"]);
      try {
        await started;
        expect(await cacheStorage.fetch(hash)).toBe(false);
        expect(await cacheStorage.isUpToDate(hash)).toBe(false);
      } finally {
        finishCopy();
        await pending;
      }
      expect(await cacheStorage.isUpToDate(hash)).toBe(true);
    });

    it("cleans up failed writes without publishing a partial cache entry", async () => {
      const { cacheStorage, hash, cacheFolder } = setupOutputs();
      jest.spyOn(fsPromises, "copyFile").mockImplementationOnce(() => {
        throw new Error("copy failed");
      });
      await expect(cacheStorage.put(hash, ["lib/**"])).rejects.toThrow(
        "copy failed"
      );
      expect(await cacheStorage.fetch(hash)).toBe(false);
      expect(await fs.readdir(path.dirname(cacheFolder))).toEqual([]);
    });

    it("keeps concurrent writes atomic and their output proofs valid", async () => {
      const {
        cacheStorage,
        hash,
        fixtureLocation,
        internalCacheFolder,
        cacheFolder,
      } = setupOutputs();
      const other = new LocalCacheStorage(
        internalCacheFolder,
        makeLogger("mute"),
        fixtureLocation
      );
      await Promise.all([
        cacheStorage.put(hash, ["lib/**"]),
        other.put(hash, ["lib/**"]),
      ]);
      expect(await cacheStorage.isUpToDate(hash)).toBe(true);
      expect((await fs.readdir(path.dirname(cacheFolder))).sort()).toEqual([
        hash,
        `${hash}.state.json`,
      ]);
    });

    it("replaces an existing same-hash entry with the complete new snapshot", async () => {
      const { cacheStorage, hash, outputFile } = setupOutputs();
      await cacheStorage.put(hash, ["lib/**"]);
      await fs.writeFile(outputFile, "updated");
      const added = path.join(path.dirname(outputFile), "new.js");
      await fs.writeFile(added, "new");
      await cacheStorage.put(hash, ["lib/**"]);
      expect(await cacheStorage.isUpToDate(hash)).toBe(true);

      await fs.remove(path.dirname(outputFile));
      expect(await cacheStorage.fetch(hash)).toBe(true);
      expect(await fs.readFile(outputFile, "utf8")).toBe("updated");
      expect(await fs.readFile(added, "utf8")).toBe("new");
    });
  });

  describe("fetch", () => {
    it("will fetch on cache hit", async () => {
      await fetchFromCache({
        fixtureName: "with-cache",
        hash: "811c319a73f988d9260fbf3f1d30f0f447c2a194",
      });
    });

    it("will fetch on cache hit (output folder: dist)", async () => {
      await fetchFromCache({
        fixtureName: "with-cache-dist",
        hash: "46df1a257dfbde62b1e284f6382b20a49506f029",
      });
    });

    it("will fetch on cache hit (multiple output folders: lib and dist)", async () => {
      await fetchFromCache({
        fixtureName: "multiple-output-folders-with-cache",
        hash: "46df1a257dfbde62b1e284f6382b20a49506f029",
      });
    });

    it("will not fetch on cache miss", async () => {
      await fetchFromCache({
        fixtureName: "with-cache",
        hash: "incorrect_hash",
        expectFailure: true,
      });
    });
  });

  describe("put", () => {
    it("will put cache in store", async () => {
      await putInCache({
        fixtureName: "pre-built",
        hash: "811c319a73f988d9260fbf3f1d30f0f447c2a194",
        outputGlob: ["lib/**"],
        filesToCache: ["lib/qwerty"],
      });
    });

    it("will put cache in store (output folder: dist)", async () => {
      await putInCache({
        fixtureName: "pre-built-dist",
        hash: "46df1a257dfbde62b1e284f6382b20a49506f029",
        outputGlob: ["dist/**"],
        filesToCache: ["dist/qwerty"],
      });
    });

    it("will put cache in store (multiple output folders: lib and dist)", async () => {
      await putInCache({
        fixtureName: "multiple-output-folders",
        hash: "46df1a257dfbde62b1e284f6382b20a49506f029",
        outputGlob: ["lib/**", "dist/**"],
        filesToCache: ["lib/qwerty", "dist/azer/ty"],
      });
    });

    it("will persist file matching glob in root folder", async () => {
      await putInCache({
        fixtureName: "basic",
        hash: "811c319a73f988d9260fbf3f1d30f0f447c2a194",
        outputGlob: ["tsconfig.tsbuildinfo"],
        filesToCache: ["tsconfig.tsbuildinfo"],
      });
    });

    it("will persist file when others are excluded in the same folder", async () => {
      await putInCache({
        fixtureName: "basic",
        hash: "46df1a257dfbde62b1e284f6382b20a49506f029",
        outputGlob: ["lib/**", "!lib/qwerty"],
        filesToCache: ["lib/azerty"],
      });
    });

    it("will persist files that are in a folder with a . in them", async () => {
      await putInCache({
        fixtureName: "basic",
        hash: "46df1a257dfbde62b1e284f6382b20a49506f029",
        outputGlob: [".react-router/**"],
        filesToCache: [".react-router/types/route.d.ts"],
      });
    });

    it("will cache and restore dotfiles inside output directories", async () => {
      await putInCache({
        fixtureName: "basic",
        hash: "dotfile-in-subdir-test-hash",
        outputGlob: ["dist/**/*"],
        filesToCache: ["dist/.vite/manifest.json"],
      });
    });

    it("will cache and restore dotfiles when using releaseDeployment/**/*", async () => {
      await putInCache({
        fixtureName: "basic",
        hash: "dotfile-releasedeployment-test-hash",
        outputGlob: ["releaseDeployment/**/*"],
        filesToCache: ["releaseDeployment/public/.vite/manifest.json"],
      });
    });

    // Different glob libraries have different behavior for ** and **/*.
    // The common expectation is that they'd behave the same, so verify it.
    it("lib/**/* matches both top-level and nested files", async () => {
      await putInCache({
        fixtureName: "basic",
        hash: "glob-nested-star-hash",
        outputGlob: ["lib/**/*"],
        filesToCache: ["lib/index.js", "lib/nested/file.js"],
      });
    });

    it("lib/** matches both top-level and nested files", async () => {
      await putInCache({
        fixtureName: "basic",
        hash: "glob-star-hash",
        outputGlob: ["lib/**"],
        filesToCache: ["lib/index.js", "lib/nested/file.js"],
      });
    });
  });

  describe("E2E (fetch + put + fetch)", () => {
    // This would have caught the issue from https://github.com/microsoft/lage/pull/1082
    it("works with cache check → build (put) → cache restore flow", async () => {
      const fixtureName = "basic";
      const fixtureLocation = setupFixture(fixtureName);
      const hash = "e2e-test-hash";

      await fetchFromCache({
        fixtureName,
        hash,
        fixtureLocation,
        expectFailure: true,
      });
      await putInCache({
        fixtureName,
        hash,
        outputGlob: ["lib/**"],
        filesToCache: ["lib/index.js"],
        fixtureLocation,
      });
      await fetchFromCache({ fixtureName, hash, fixtureLocation });
    });
  });
});
