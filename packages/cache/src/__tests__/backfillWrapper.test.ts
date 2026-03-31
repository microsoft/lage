import { describe, expect, it } from "@jest/globals";
import type { AzureBlobCacheStorageConfig, AzureBlobCacheStorageConnectionStringOptions } from "backfill-config";
import path from "path";
import { createBackfillLogger, createBackfillCacheConfig } from "../backfillWrapper.js";
import { CredentialCache } from "../CredentialCache.js";

describe("backfill-config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Note: jest-setup.js clears all BACKFILL_ vars that might have come from CI
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should read values from environment variables", () => {
    process.env.BACKFILL_CACHE_PROVIDER = "azure-blob";
    process.env.BACKFILL_CACHE_PROVIDER_OPTIONS = JSON.stringify({ connectionString: "somestring", container: "somecontainer" });

    const dummyLogger = createBackfillLogger();
    const fixture = path.join(__dirname, "fixtures/backfill-config");
    const config = createBackfillCacheConfig(fixture, {}, dummyLogger);

    expect(config.cacheStorageConfig.provider).toBe("azure-blob");

    const cacheStorageConfig = config.cacheStorageConfig as AzureBlobCacheStorageConfig;
    const cacheOptions = cacheStorageConfig.options as AzureBlobCacheStorageConnectionStringOptions;
    expect(cacheOptions.connectionString).toBe("somestring");
    expect(cacheOptions.container).toBe("somecontainer");
  });

  it("should let environment variables override values given in config parameter", () => {
    process.env.BACKFILL_CACHE_PROVIDER = "azure-blob";
    process.env.BACKFILL_CACHE_PROVIDER_OPTIONS = JSON.stringify({ connectionString: "somestring", container: "somecontainer" });

    const dummyLogger = createBackfillLogger();
    const fixture = path.join(__dirname, "fixtures/backfill-config");
    const config = createBackfillCacheConfig(
      fixture,
      {
        cacheStorageConfig: {
          provider: "local",
        },
      },
      dummyLogger
    );

    expect(config.cacheStorageConfig.provider).toBe("azure-blob");
  });
});
