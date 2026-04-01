import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { makeLogger } from "backfill-logger";
import { getEnvConfig } from "../envConfig.js";
import type { CacheStorageConfig } from "../cacheConfig.js";

describe("getEnvConfig()", () => {
  const originalEnv = { ...process.env };
  const logger = makeLogger("mute");

  beforeEach(() => {
    // Note: jest-setup.js clears all BACKFILL_ vars that might have come from CI
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("sets log folder through env variable", () => {
    process.env["BACKFILL_LOG_FOLDER"] = "foo";

    const config = getEnvConfig(logger);
    expect(config).toStrictEqual({ logFolder: "foo" });
  });

  it("sets the performance logging flag through env variable", () => {
    process.env["BACKFILL_PRODUCE_PERFORMANCE_LOGS"] = "true";

    const config = getEnvConfig(logger);
    expect(config).toStrictEqual({ producePerformanceLogs: true });
  });

  it("sets local cache folder through env variable", () => {
    process.env["BACKFILL_INTERNAL_CACHE_FOLDER"] = "bar";

    const config = getEnvConfig(logger);
    expect(config).toStrictEqual({ internalCacheFolder: "bar" });
  });

  it("sets cache provider through env variables", () => {
    const cacheStorageConfig: CacheStorageConfig = {
      provider: "npm",
      options: {
        npmPackageName: "package",
        registryUrl: "https://registry.npmjs.org/",
      },
    };

    process.env["BACKFILL_CACHE_PROVIDER"] = cacheStorageConfig.provider;
    process.env["BACKFILL_CACHE_PROVIDER_OPTIONS"] = JSON.stringify(
      cacheStorageConfig.options
    );

    const config = getEnvConfig(logger);
    expect(config).toStrictEqual({ cacheStorageConfig });
  });

  it("sets performance report name through env variable", () => {
    process.env["BACKFILL_PERFORMANCE_REPORT_NAME"] = "report";

    const config = getEnvConfig(logger);
    expect(config).toStrictEqual({ performanceReportName: "report" });
  });

  it("throws on invalid log level", () => {
    process.env["BACKFILL_LOG_LEVEL"] = "nope";
    expect(() => getEnvConfig(logger)).toThrowErrorMatchingInlineSnapshot(`
     "Backfill config option BACKFILL_LOG_LEVEL was set to an invalid value.
     Expected: one of silly, verbose, info, warn, error, mute
     Received: nope"
    `);
  });

  it("throws on invalid mode", () => {
    process.env["BACKFILL_MODE"] = "nope";
    expect(() => getEnvConfig(logger)).toThrowErrorMatchingInlineSnapshot(`
     "Backfill config option BACKFILL_MODE was set to an invalid value.
     Expected: one of READ_ONLY, WRITE_ONLY, READ_WRITE, PASS
     Received: nope"
    `);
  });

  it("throws on invalid output glob", () => {
    process.env["BACKFILL_OUTPUT_GLOB"] = "nope";
    expect(() => getEnvConfig(logger)).toThrowErrorMatchingInlineSnapshot(`
     "Backfill config option BACKFILL_OUTPUT_GLOB was set to an invalid value.
     Expected: array of strings
     Received: nope"
    `);
  });

  it("throws on invalid npm cache provider options", () => {
    process.env["BACKFILL_CACHE_PROVIDER"] = "npm";
    process.env["BACKFILL_CACHE_PROVIDER_OPTIONS"] = "invalid-json";
    expect(() => getEnvConfig(logger)).toThrow(
      `Could not parse BACKFILL_CACHE_PROVIDER_OPTIONS as JSON:\n"invalid-json"`
    );

    process.env["BACKFILL_CACHE_PROVIDER_OPTIONS"] = "{}";
    expect(() => getEnvConfig(logger)).toThrowErrorMatchingInlineSnapshot(`
     "Invalid BACKFILL_CACHE_PROVIDER_OPTIONS for BACKFILL_CACHE_PROVIDER="npm":
     Expected: object with string values for keys "npmPackageName", "registryUrl"
     Received: "{}""
    `);
  });

  it("throws on invalid azure-blob cache provider options", () => {
    process.env["BACKFILL_CACHE_PROVIDER"] = "azure-blob";
    process.env["BACKFILL_CACHE_PROVIDER_OPTIONS"] = "invalid-json";
    expect(() => getEnvConfig(logger)).toThrow(
      `Could not parse BACKFILL_CACHE_PROVIDER_OPTIONS as JSON:\n"invalid-json"`
    );

    process.env["BACKFILL_CACHE_PROVIDER_OPTIONS"] = "{}";
    expect(() => getEnvConfig(logger)).toThrowErrorMatchingInlineSnapshot(`
     "Invalid BACKFILL_CACHE_PROVIDER_OPTIONS for BACKFILL_CACHE_PROVIDER="azure-blob":
     Expected: object with string values for keys "connectionString", "container"
     Received: "{}""
    `);
  });

  // This should be updated to check for a thrown error once more config
  // validation is added in a major version
  it("does not throw on invalid cache provider name", () => {
    const warnSpy = jest.spyOn(logger, "warn");
    process.env["BACKFILL_CACHE_PROVIDER"] = "nope";
    process.env["BACKFILL_CACHE_PROVIDER_OPTIONS"] = "stuff";

    const config = getEnvConfig(logger);
    expect(config.cacheStorageConfig).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      'Ignoring unknown BACKFILL_CACHE_PROVIDER: "nope"'
    );
  });
});
