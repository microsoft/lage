import { jest } from "@jest/globals";
import type { Readable } from "stream";

export interface AzureStorageClientMocks {
  /** Matches used methods from `ContainerClient` from `@azure/storage-blob` */
  mockContainerClient: {
    getBlobClient: jest.Mock<(blobName: string) => AzureStorageClientMocks["mockBlobClient"]>;
  };
  /** Matches used methods from `BlobClient` from `@azure/storage-blob` */
  mockBlobClient: {
    getProperties: jest.Mock<() => Promise<{ contentLength?: number }>>;
    download: jest.Mock<(offset?: number) => Promise<{ readableStreamBody: Readable | undefined }>>;
    getBlockBlobClient: jest.Mock<() => AzureStorageClientMocks["mockBlockBlobClient"]>;
  };
  /** Matches used methods from `BlockBlobClient` from `@azure/storage-blob` */
  mockBlockBlobClient: {
    uploadStream: jest.Mock<(stream: Readable, bufferSize?: number, maxConcurrency?: number, options?: unknown) => Promise<unknown>>;
  };
}

/**
 * Create mock objects for the `@azure/blob-storage` APIs used by `AzureBlobCacheStorage`.
 */
export function makeAzureStorageClientMocks(): AzureStorageClientMocks {
  const mockBlockBlobClient: AzureStorageClientMocks["mockBlockBlobClient"] = {
    uploadStream: jest.fn(() => Promise.resolve({})),
  };
  const mockBlobClient: AzureStorageClientMocks["mockBlobClient"] = {
    getProperties: jest.fn(() => Promise.resolve({ contentLength: 100 })),
    download: jest.fn(() => Promise.resolve({ readableStreamBody: undefined })),
    getBlockBlobClient: jest.fn(() => mockBlockBlobClient),
  };
  const mockContainerClient: AzureStorageClientMocks["mockContainerClient"] = {
    getBlobClient: jest.fn(() => mockBlobClient),
  };
  return { mockContainerClient, mockBlobClient, mockBlockBlobClient };
}
