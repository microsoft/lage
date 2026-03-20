import path from "path";
import fs from "fs-extra";

import { makeLogger } from "backfill-logger";
import { setupFixture, type FixtureName } from "@lage-run/test-utilities";
import type { CacheStorageConfig } from "backfill-config";

import { getCacheStorageProvider } from "../getCacheStorageProvider.js";

const setupCacheStorage = (fixtureName: FixtureName) => {
  const fixtureLocation = setupFixture(fixtureName);

  const cacheStorageConfig: CacheStorageConfig = {
    provider: "local",
  };
  const internalCacheFolder = path.join("node_modules", ".cache", "backfill");
  const logger = makeLogger("mute");

  const cacheStorage = getCacheStorageProvider(
    cacheStorageConfig,
    internalCacheFolder,
    logger,
    fixtureLocation
  );

  return { cacheStorage, internalCacheFolder, fixtureLocation };
};

function createFileInFolder(folder: string, filename: string) {
  fs.outputFileSync(path.join(folder, filename), "");
}

function expectPathExists(pathToCheck: string, expectSuccess: boolean) {
  expect(fs.pathExistsSync(pathToCheck)).toBe(expectSuccess);
}

type CacheHelper = {
  fixtureName: FixtureName;
  hash: string;
  outputGlob?: string[];
  filesToCache?: string[];
  expectSuccess?: boolean;
  errorMessage?: string;
};

async function fetchFromCache({
  fixtureName,
  hash,
  expectSuccess = true,
}: CacheHelper) {
  const { cacheStorage, internalCacheFolder, fixtureLocation } =
    setupCacheStorage(fixtureName);

  const secretFile = "qwerty";

  if (expectSuccess) {
    createFileInFolder(
      path.join(fixtureLocation, internalCacheFolder, hash),
      secretFile
    );
  }

  const fetchResult = await cacheStorage.fetch(hash);
  expect(fetchResult).toBe(expectSuccess);

  expectPathExists(path.join(fixtureLocation, secretFile), expectSuccess);
}

async function putInCache({
  fixtureName,
  hash,
  outputGlob,
  filesToCache,
  expectSuccess = true,
  errorMessage,
}: CacheHelper) {
  const { cacheStorage, internalCacheFolder, fixtureLocation } =
    setupCacheStorage(fixtureName);

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

  if (expectSuccess) {
    filesToCache.forEach((f) => createFileInFolder(fixtureLocation, f));
  }

  if (expectSuccess) {
    await cacheStorage.put(hash, outputGlob);
  } else {
    await expect(cacheStorage.put(hash, outputGlob)).rejects.toThrow(
      errorMessage
    );
  }

  filesToCache.forEach((f) => {
    const pathToCheck = expectSuccess
      ? path.join(internalCacheFolder, hash, f)
      : internalCacheFolder;

    expectPathExists(path.join(fixtureLocation, pathToCheck), expectSuccess);
  });

  if (expectSuccess) {
    for (const f of filesToCache) {
      fs.removeSync(path.join(fixtureLocation, f));
      expectPathExists(path.join(fixtureLocation, f), false);
      await cacheStorage.fetch(hash);
      expectPathExists(path.join(fixtureLocation, f), true);
    }
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
        expectSuccess: false,
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
  });
});
