import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import {
  createTempDir as _createTempDir,
  makeAzureStorageClientMocks,
  removeTempDir,
  removeTempDirAsync,
  type AzureStorageClientMocks,
} from "@lage-run/test-utilities";
import { makeLogger } from "backfill-logger";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { buffer } from "stream/consumers";
import { pipeline } from "stream/promises";
import tarFs from "tar-fs";
import { AzureBlobCacheStorage } from "../AzureBlobCacheStorage.js";

describe("AzureBlobCacheStorage", () => {
  let dirs: string[] = [];
  let cwd: string;
  let containerClient: AzureStorageClientMocks["mockContainerClient"];
  let blobClient: AzureStorageClientMocks["mockBlobClient"];
  let blockBlobClient: AzureStorageClientMocks["mockBlockBlobClient"];
  const logger = makeLogger("mute");

  /** Create a temp directory that will be cleaned up after the test */
  function createTempDir(options?: { prefix: string }): string {
    const dir = _createTempDir(options);
    dirs.push(dir);
    return dir;
  }

  beforeEach(() => {
    cwd = createTempDir({ prefix: "test-azure-cache-" });
    ({
      mockContainerClient: containerClient,
      mockBlobClient: blobClient,
      mockBlockBlobClient: blockBlobClient,
    } = makeAzureStorageClientMocks());
  });

  afterEach(() => {
    for (const dir of dirs) {
      removeTempDir(dir);
    }
    dirs = [];
  });

  describe("fetch()", () => {
    /** Get a tar stream containing `entries` from `dir` */
    async function getTarStream(dir: string, entries: string[]) {
      // tar-fs mutates its input...
      return Readable.from(
        await buffer(tarFs.pack(dir, { entries: [...entries] }))
      );
    }

    it("returns true and extracts files on cache hit", async () => {
      const sourceDir = createTempDir({ prefix: "test-azure-src-" });
      fs.mkdirSync(path.join(sourceDir, "lib"), { recursive: true });
      fs.writeFileSync(path.join(sourceDir, "lib", "index.js"), "hello");

      blobClient.download.mockResolvedValue({
        readableStreamBody: await getTarStream(sourceDir, ["lib/index.js"]),
      });

      const storage = new AzureBlobCacheStorage(
        { containerClient },
        logger,
        cwd
      );
      const result = await storage.fetch("test-hash");

      expect(result).toBe(true);
      expect(fs.readFileSync(path.join(cwd, "lib", "index.js"), "utf-8")).toBe(
        "hello"
      );
      expect(blobClient.download).toHaveBeenCalledWith(0);
    });

    it("returns false on 404", async () => {
      blobClient.download.mockRejectedValue({
        statusCode: 404,
        message: "BlobNotFound",
      });

      const storage = new AzureBlobCacheStorage(
        { containerClient },
        logger,
        cwd
      );
      const result = await storage.fetch("test-hash");

      expect(result).toBe(false);
    });

    it("propagates non-404 errors", async () => {
      blobClient.download.mockRejectedValue({
        statusCode: 403,
        message: "AuthorizationFailure",
      });

      const storage = new AzureBlobCacheStorage(
        { containerClient },
        logger,
        cwd
      );

      await expect(storage.fetch("test-hash")).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("throws when readableStreamBody is missing", async () => {
      blobClient.download.mockResolvedValue({
        readableStreamBody: undefined,
      });

      const storage = new AzureBlobCacheStorage(
        { containerClient },
        logger,
        cwd
      );

      await expect(storage.fetch("test-hash")).rejects.toThrow(
        "Unable to fetch blob"
      );
    });

    it("skips download when blob exceeds maxSize", async () => {
      blobClient.getProperties.mockResolvedValue({ contentLength: 2000 });

      const storage = new AzureBlobCacheStorage(
        { containerClient, maxSize: 1000 },
        logger,
        cwd
      );
      const result = await storage.fetch("test-hash");

      expect(result).toBe(false);
      expect(blobClient.download).not.toHaveBeenCalled();
    });

    it("proceeds with download when blob is under maxSize", async () => {
      const sourceDir = createTempDir({ prefix: "test-azure-src-" });

      blobClient.getProperties.mockResolvedValue({ contentLength: 999 });
      blobClient.download.mockResolvedValue({
        readableStreamBody: await getTarStream(sourceDir, []),
      });

      const storage = new AzureBlobCacheStorage(
        { containerClient, maxSize: 1000 },
        logger,
        cwd
      );
      await storage.fetch("test-hash");

      expect(blobClient.download).toHaveBeenCalled();
    });

    it("never calls getProperties when maxSize is not configured", async () => {
      const sourceDir = createTempDir({ prefix: "test-azure-src-" });
      blobClient.download.mockResolvedValue({
        readableStreamBody: await getTarStream(sourceDir, []),
      });

      const storage = new AzureBlobCacheStorage(
        { containerClient },
        logger,
        cwd
      );
      await storage.fetch("test-hash");

      expect(blobClient.getProperties).not.toHaveBeenCalled();
    });

    it("calls getBlobClient with the hash", async () => {
      blobClient.download.mockRejectedValue({ statusCode: 404 });

      const storage = new AzureBlobCacheStorage(
        { containerClient },
        logger,
        cwd
      );
      await storage.fetch("abc123");

      expect(containerClient.getBlobClient).toHaveBeenCalledWith("abc123");
    });
  });

  describe("put()", () => {
    it("packs files into a tar and uploads them", async () => {
      fs.mkdirSync(path.join(cwd, "lib"), { recursive: true });
      fs.writeFileSync(path.join(cwd, "lib", "index.js"), "hello");

      let capturedData: Buffer = Buffer.alloc(0);
      blockBlobClient.uploadStream.mockImplementation(
        async (stream: NodeJS.ReadableStream) => {
          capturedData = await buffer(stream);
        }
      );

      const storage = new AzureBlobCacheStorage(
        { containerClient },
        logger,
        cwd
      );
      await storage.put("test-hash", ["lib/**"]);

      expect(blockBlobClient.uploadStream).toHaveBeenCalledWith(
        expect.objectContaining({ pipe: expect.any(Function) }),
        4 * 1024 * 1024,
        5
      );

      // Verify the tar archive actually contains the expected file
      const extractDir = createTempDir({ prefix: "test-azure-extract-" });
      await pipeline(Readable.from(capturedData), tarFs.extract(extractDir));
      expect(
        fs.readFileSync(path.join(extractDir, "lib", "index.js"), "utf-8")
      ).toBe("hello");
    });

    it("skips upload when total file size exceeds maxSize", async () => {
      fs.mkdirSync(path.join(cwd, "lib"), { recursive: true });
      fs.writeFileSync(path.join(cwd, "lib", "large1.js"), Buffer.alloc(900));
      fs.writeFileSync(path.join(cwd, "lib", "large2.js"), Buffer.alloc(200));

      const storage = new AzureBlobCacheStorage(
        { containerClient, maxSize: 1000 },
        logger,
        cwd
      );
      await storage.put("test-hash", ["lib/**"]);

      expect(blockBlobClient.uploadStream).not.toHaveBeenCalled();
    });

    it("proceeds with upload when total file size is under maxSize", async () => {
      fs.mkdirSync(path.join(cwd, "lib"), { recursive: true });
      fs.writeFileSync(path.join(cwd, "lib", "small.js"), Buffer.alloc(500));

      blockBlobClient.uploadStream.mockImplementation(
        async (stream: NodeJS.ReadableStream) => {
          await buffer(stream);
        }
      );

      const storage = new AzureBlobCacheStorage(
        { containerClient, maxSize: 1000 },
        logger,
        cwd
      );
      await storage.put("test-hash", ["lib/**"]);

      expect(blockBlobClient.uploadStream).toHaveBeenCalledTimes(1);
    });

    it("calls getBlobClient with the correct hash", async () => {
      fs.mkdirSync(path.join(cwd, "lib"), { recursive: true });
      fs.writeFileSync(path.join(cwd, "lib", "index.js"), "x");

      blockBlobClient.uploadStream.mockImplementation(
        async (stream: NodeJS.ReadableStream) => {
          await buffer(stream);
        }
      );

      const storage = new AzureBlobCacheStorage(
        { containerClient },
        logger,
        cwd
      );
      await storage.put("myHash123", ["lib/**"]);

      expect(containerClient.getBlobClient).toHaveBeenCalledWith("myHash123");
    });
  });

  describe("E2E (fetch + put + fetch)", () => {
    // This would have caught the issue from https://github.com/microsoft/lage/pull/1082
    it("simulates cache miss → build → cache restore flow", async () => {
      const hash = "e2e-azure-hash";

      // --- fetch (miss) ---
      blobClient.download.mockRejectedValueOnce({ statusCode: 404 });

      const storage = new AzureBlobCacheStorage(
        { containerClient },
        logger,
        cwd
      );

      const missResult = await storage.fetch(hash);
      expect(missResult).toBe(false);

      // --- build (simulate output files appearing) ---
      fs.mkdirSync(path.join(cwd, "lib"), { recursive: true });
      fs.writeFileSync(path.join(cwd, "lib", "index.js"), "built output");

      // --- put (capture the uploaded tar) ---
      let capturedTar: Buffer = Buffer.alloc(0);
      blockBlobClient.uploadStream.mockImplementation(
        async (stream: NodeJS.ReadableStream) => {
          capturedTar = await buffer(stream);
        }
      );

      await storage.put(hash, ["lib/**"]);
      expect(capturedTar.length).toBeGreaterThan(0);

      // --- delete output (simulate clean checkout) ---
      await removeTempDirAsync(path.join(cwd, "lib"), {
        throwOnError: true,
        maxAttempts: 4,
      });

      // --- fetch (hit — replay the captured tar) ---
      blobClient.download.mockResolvedValueOnce({
        readableStreamBody: Readable.from(capturedTar),
      });

      const hitResult = await storage.fetch(hash);
      expect(hitResult).toBe(true);
      expect(fs.readFileSync(path.join(cwd, "lib", "index.js"), "utf-8")).toBe(
        "built output"
      );
    });
  });
});
