import { describe, expect, it } from "@jest/globals";
import { setupFixture, type FixtureName } from "@lage-run/test-utilities";
import { makeLogger } from "backfill-logger";
import fs from "fs-extra";
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
