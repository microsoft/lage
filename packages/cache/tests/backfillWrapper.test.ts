import { AzureBlobCacheStorageConfig } from "backfill-config";
import path from "path";
import { createBackfillLogger, createBackfillCacheConfig } from "../src/backfillWrapper";

describe("backfill-config", () => {
  it("should read values from environment variables", () => {
    process.env.BACKFILL_CACHE_PROVIDER = "azure-blob";
    process.env.BACKFILL_CACHE_PROVIDER_OPTIONS = JSON.stringify({ connectionString: "somestring", container: "somecontainer" });

    const dummyLogger = createBackfillLogger();
    const fixture = path.join(__dirname, "fixtures/backfill-config");
    const config = createBackfillCacheConfig(fixture, {}, dummyLogger);

    expect(config.cacheStorageConfig.provider).toBe("azure-blob");

    const cacheStorageConfig = config.cacheStorageConfig as AzureBlobCacheStorageConfig;
    expect(cacheStorageConfig.options.connectionString).toBe("somestring");
    expect(cacheStorageConfig.options.container).toBe("somecontainer");

    delete process.env.BACKFILL_CACHE_PROVIDER;
    delete process.env.BACKFILL_CACHE_PROVIDER_OPTIONS;
  });

  it("should override environment variables with values given in config parameter", () => {
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

    expect(config.cacheStorageConfig.provider).toBe("local");

    delete process.env.BACKFILL_CACHE_PROVIDER;
    delete process.env.BACKFILL_CACHE_PROVIDER_OPTIONS;
  });
});
