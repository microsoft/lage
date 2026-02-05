import type { AzureBlobCacheStorageConfig, AzureBlobCacheStorageConnectionStringOptions } from "backfill-config";
import path from "path";
import { createBackfillLogger, createBackfillCacheConfig } from "../src/backfillWrapper.js";

describe("backfill-config", () => {
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

    delete process.env.BACKFILL_CACHE_PROVIDER;
    delete process.env.BACKFILL_CACHE_PROVIDER_OPTIONS;
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

    delete process.env.BACKFILL_CACHE_PROVIDER;
    delete process.env.BACKFILL_CACHE_PROVIDER_OPTIONS;
  });
});
