import type { CustomCacheStorageConfig } from "backfill-config";
import path from "path";
import { createBackfillLogger, createBackfillCacheConfig } from "../backfillWrapper.js";

describe("backfill-config", () => {
  it("should read values from environment variables", () => {
    process.env.BACKFILL_CACHE_PROVIDER = "azure-blob";
    process.env.BACKFILL_CACHE_PROVIDER_OPTIONS = JSON.stringify({ connectionString: "somestring", container: "somecontainer" });

    const dummyLogger = createBackfillLogger();
    const fixture = path.join(__dirname, "fixtures/backfill-config");
    const config = createBackfillCacheConfig(fixture, {}, dummyLogger);

    // azure-blob env var is now mapped to the custom plugin config
    expect(config.cacheStorageConfig.provider).toBe("custom");

    const cacheStorageConfig = config.cacheStorageConfig as CustomCacheStorageConfig;
    expect(cacheStorageConfig.plugin).toBe("@lage-run/azure-blob-cache-storage");
    const cacheOptions = cacheStorageConfig.options as { connectionString: string; container: string };
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

    // azure-blob env var is now mapped to the custom plugin config
    expect(config.cacheStorageConfig.provider).toBe("custom");

    delete process.env.BACKFILL_CACHE_PROVIDER;
    delete process.env.BACKFILL_CACHE_PROVIDER_OPTIONS;
  });
});
