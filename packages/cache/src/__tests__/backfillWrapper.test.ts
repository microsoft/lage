import { afterAll, afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { AzureBlobCacheStorageConfig, AzureBlobCacheStorageConnectionStringOptions } from "backfill-config";
import path from "path";
import { createBackfillCacheConfig, createBackfillLogger } from "../backfillWrapper.js";
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

describe("createBackfillCacheConfig credential handling", () => {
  const fixture = path.join(__dirname, "fixtures/backfill-config");
  const originalEnv = process.env;

  let getInstanceSpy: jest.SpiedFunction<typeof CredentialCache.getInstance>;

  beforeEach(() => {
    getInstanceSpy = jest.spyOn(CredentialCache, "getInstance").mockReturnValue({ getToken: jest.fn() } as any);
    // Note: jest-setup.js clears all BACKFILL_ vars that might have come from CI
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    getInstanceSpy.mockRestore();
    delete process.env.AZURE_IDENTITY_CREDENTIAL_NAME;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("selects credential from credentialName in config options", () => {
    process.env.BACKFILL_CACHE_PROVIDER = "azure-blob";
    process.env.BACKFILL_CACHE_PROVIDER_OPTIONS = JSON.stringify({
      connectionString: "DefaultEndpointsProtocol=https;EndpointSuffix=core.windows.net",
      container: "test",
      credentialName: "azure-cli",
    });

    const dummyLogger = createBackfillLogger();
    createBackfillCacheConfig(fixture, {}, dummyLogger);

    expect(getInstanceSpy).toHaveBeenCalledWith("azure-cli");
  });

  it("selects credential from AZURE_IDENTITY_CREDENTIAL_NAME env var when no credentialName in config", () => {
    process.env.BACKFILL_CACHE_PROVIDER = "azure-blob";
    process.env.BACKFILL_CACHE_PROVIDER_OPTIONS = JSON.stringify({
      connectionString: "DefaultEndpointsProtocol=https;EndpointSuffix=core.windows.net",
      container: "test",
    });
    process.env.AZURE_IDENTITY_CREDENTIAL_NAME = "managed-identity";

    const dummyLogger = createBackfillLogger();
    createBackfillCacheConfig(fixture, {}, dummyLogger);

    expect(getInstanceSpy).toHaveBeenCalledWith("managed-identity");
  });

  it("throws descriptive error for invalid credentialName", () => {
    process.env.BACKFILL_CACHE_PROVIDER = "azure-blob";
    process.env.BACKFILL_CACHE_PROVIDER_OPTIONS = JSON.stringify({
      connectionString: "DefaultEndpointsProtocol=https;EndpointSuffix=core.windows.net",
      container: "test",
      credentialName: "not-a-valid-name",
    });

    const dummyLogger = createBackfillLogger();

    expect(() => createBackfillCacheConfig(fixture, {}, dummyLogger)).toThrow(/Invalid cacheStorageConfig\.options\.credentialName/);
  });

  it("skips credential injection for token-based (AccountKey) connection strings", () => {
    process.env.BACKFILL_CACHE_PROVIDER = "azure-blob";
    process.env.BACKFILL_CACHE_PROVIDER_OPTIONS = JSON.stringify({
      connectionString: "DefaultEndpointsProtocol=https;AccountName=test;AccountKey=abc123;EndpointSuffix=core.windows.net",
      container: "test",
    });

    const dummyLogger = createBackfillLogger();
    const config = createBackfillCacheConfig(fixture, {}, dummyLogger);

    expect(getInstanceSpy).not.toHaveBeenCalled();

    const azureConfig = config.cacheStorageConfig as AzureBlobCacheStorageConfig;
    const opts = azureConfig.options as AzureBlobCacheStorageConnectionStringOptions;
    expect(opts.credential).toBeUndefined();
  });

  it("falls back to EnvironmentCredential when no credentialName and no env var", () => {
    process.env.BACKFILL_CACHE_PROVIDER = "azure-blob";
    process.env.BACKFILL_CACHE_PROVIDER_OPTIONS = JSON.stringify({
      connectionString: "DefaultEndpointsProtocol=https;EndpointSuffix=core.windows.net",
      container: "test",
    });

    const dummyLogger = createBackfillLogger();
    createBackfillCacheConfig(fixture, {}, dummyLogger);

    // Called with no args → defaults to EnvironmentCredential
    expect(getInstanceSpy).toHaveBeenCalledWith();
  });
});
