import * as path from "path";
import { Transform, type TransformCallback, pipeline } from "stream";
import tarFs from "tar-fs";

import type { Logger } from "backfill-logger";
import type { AzureBlobCacheStorageOptions } from "backfill-config";

import { stat } from "fs-extra";
import type { ContainerClient } from "@azure/storage-blob";
import { CacheStorage } from "./CacheStorage.js";

const ONE_MEGABYTE = 1024 * 1024;
const FOUR_MEGABYTES = 4 * ONE_MEGABYTE;

/*
 * Timeout stream, will emit an error event if the
 * input has not started providing data after a given time after
 * its creation.
 */
class TimeoutStream extends Transform {
  private timeout: NodeJS.Timeout;
  constructor(timeout: number, message: string) {
    super();
    this.timeout = setTimeout(() => {
      this.destroy(new Error(message));
    }, timeout);
  }
  public _transform(
    chunk: any,
    _encoding: BufferEncoding,
    callback: TransformCallback
  ): void {
    clearTimeout(this.timeout);
    this.push(chunk);
    callback();
  }
}

/*
 * Sponge stream, it will accumulate all the data it receives
 * and emit it only if and when the input stream sends the "end" event.
 */
class SpongeStream extends Transform {
  constructor() {
    super({
      // This stream should never receive more data than its readableHighWaterMark
      // otherwise the stream will get into a deadlock
      // 1 TB should give enough room :)
      readableHighWaterMark: 1024 * 1024 * 1024 * 1024,
    });
  }
  public _transform(
    chunk: any,
    _encoding: BufferEncoding,
    callback: TransformCallback
  ): void {
    this.pause();
    this.push(chunk);
    callback();
  }
  public _flush(callback: TransformCallback): void {
    this.resume();
    callback();
  }
}

const uploadOptions = {
  bufferSize: FOUR_MEGABYTES,
  maxBuffers: 5,
};

export class AzureBlobCacheStorage extends CacheStorage {
  private readonly getContainerClient: () => Promise<ContainerClient>;

  constructor(
    private options: AzureBlobCacheStorageOptions,
    logger: Logger,
    cwd: string,
    incrementalCaching = false
  ) {
    super(logger, cwd, incrementalCaching);

    if ("containerClient" in options) {
      this.getContainerClient = () =>
        Promise.resolve(options.containerClient as ContainerClient);
    } else {
      const { connectionString, container, credential } = options;
      // This is delay loaded because it's very slow to parse
      this.getContainerClient = () =>
        import("@azure/storage-blob").then(({ BlobServiceClient }) => {
          const blobServiceClient = credential
            ? new BlobServiceClient(connectionString, credential)
            : BlobServiceClient.fromConnectionString(connectionString);

          const containerClient =
            blobServiceClient.getContainerClient(container);
          return containerClient;
        });
    }
  }

  protected async _fetch(hash: string): Promise<boolean> {
    try {
      const blobClient = (await this.getContainerClient()).getBlobClient(hash);

      // If a maxSize has been specified, make sure to check the properties for the size before transferring
      if (this.options.maxSize) {
        const sizeResponse = await blobClient.getProperties();

        if (
          sizeResponse.contentLength &&
          sizeResponse.contentLength > this.options.maxSize
        ) {
          this.logger.verbose(
            `A blob is too large to be downloaded: ${hash}, size: ${sizeResponse.contentLength} bytes`
          );
          return false;
        }
      }

      const response = await blobClient.download(0);

      const blobReadableStream = response.readableStreamBody;
      if (!blobReadableStream) {
        throw new Error("Unable to fetch blob.");
      }

      const tarWritableStream = tarFs.extract(this.cwd);

      const spongeStream = new SpongeStream();

      const timeoutStream = new TimeoutStream(
        10 * 60 * 1000,
        `The fetch request to ${hash} seems to be hanging`
      );

      const extractionPipeline = new Promise<void>((resolve, reject) =>
        pipeline(
          blobReadableStream,
          spongeStream,
          timeoutStream,
          tarWritableStream,
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        )
      );

      await extractionPipeline;

      return true;
    } catch (error) {
      if (error && (error as any).statusCode === 404) {
        return false;
      } else {
        throw error;
      }
    }
  }

  protected async _put(hash: string, filesToCache: string[]): Promise<void> {
    // If there's a maxSize limit, first sum up the total size of bytes of all the outputGlobbed files
    // (do this before starting a tar stream)
    if (this.options.maxSize) {
      let total = 0;
      for (const file of filesToCache) {
        total = total + (await stat(path.join(this.cwd, file))).size;
      }

      if (total > this.options.maxSize) {
        this.logger.verbose(
          `The output is too large to be uploaded: ${hash}, size: ${total} bytes`
        );
        return;
      }
    }

    const blobClient = (await this.getContainerClient()).getBlobClient(hash);

    const blockBlobClient = blobClient.getBlockBlobClient();

    // tar-fs mutates the provided entries...
    const tarStream = tarFs.pack(this.cwd, { entries: [...filesToCache] });

    await blockBlobClient.uploadStream(
      tarStream,
      uploadOptions.bufferSize,
      uploadOptions.maxBuffers
    );
  }
}
