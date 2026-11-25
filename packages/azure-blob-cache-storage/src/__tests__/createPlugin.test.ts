import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { AzureBlobCacheStorageConnectionStringOptions } from "backfill-config";
import { makeLogger } from "backfill-logger";
import { makeAzureStorageClientMocks } from "@lage-run/test-utilities";
import plugin from "../createPlugin.js";
import { CredentialCache, type AzureCredentialName } from "../CredentialCache.js";

describe("Azure cache plugin credential handling", () => {
  const logger = makeLogger("mute");
  const originalEnv = process.env;
  let getInstanceSpy: jest.SpiedFunction<typeof CredentialCache.getInstance>;

  function createOptions(): AzureBlobCacheStorageConnectionStringOptions & { credentialName?: AzureCredentialName } {
    return {
      connectionString: "DefaultEndpointsProtocol=https;EndpointSuffix=core.windows.net",
      container: "test",
    };
  }

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.AZURE_IDENTITY_CREDENTIAL_NAME;
    getInstanceSpy = jest.spyOn(CredentialCache, "getInstance").mockReturnValue({
      getToken: jest.fn(() => Promise.resolve(null)),
    });
  });

  afterEach(() => {
    getInstanceSpy.mockRestore();
    process.env = originalEnv;
  });

  it("selects credential from credentialName in plugin options", () => {
    plugin.getProvider(logger, __dirname, { ...createOptions(), credentialName: "azure-cli" });

    expect(getInstanceSpy).toHaveBeenCalledWith("azure-cli");
  });

  it("selects credential from AZURE_IDENTITY_CREDENTIAL_NAME when no credentialName is configured", () => {
    process.env.AZURE_IDENTITY_CREDENTIAL_NAME = "managed-identity";

    plugin.getProvider(logger, __dirname, createOptions());

    expect(getInstanceSpy).toHaveBeenCalledWith("managed-identity");
  });

  it("prefers credentialName in plugin options over the environment variable", () => {
    process.env.AZURE_IDENTITY_CREDENTIAL_NAME = "managed-identity";

    plugin.getProvider(logger, __dirname, { ...createOptions(), credentialName: "azure-cli" });

    expect(getInstanceSpy).toHaveBeenCalledWith("azure-cli");
  });

  it("throws a descriptive error for an invalid credentialName", () => {
    expect(() =>
      plugin.getProvider(logger, __dirname, {
        ...createOptions(),
        // @ts-expect-error -- validate invalid JavaScript configuration at runtime
        credentialName: "not-a-valid-name",
      })
    ).toThrow(/Invalid credentialName/);
  });

  it("throws a descriptive error for an invalid credential environment variable", () => {
    process.env.AZURE_IDENTITY_CREDENTIAL_NAME = "not-a-valid-name";

    expect(() => plugin.getProvider(logger, __dirname, createOptions())).toThrow(/Invalid credentialName/);
  });

  it.each(["AccountKey", "SharedAccessSignature"])("skips credential injection for %s connection strings", (token) => {
    const options = createOptions();
    options.connectionString += `;${token}=test`;

    plugin.getProvider(logger, __dirname, options);

    expect(getInstanceSpy).not.toHaveBeenCalled();
    expect(options.credential).toBeUndefined();
  });

  it("falls back to EnvironmentCredential when no credentialName or environment variable is configured", () => {
    plugin.getProvider(logger, __dirname, createOptions());

    expect(getInstanceSpy).toHaveBeenCalledWith();
  });

  it("preserves an explicitly supplied credential", () => {
    const options = createOptions();
    const credential = { getToken: jest.fn(() => Promise.resolve(null)) };
    options.credential = credential;

    plugin.getProvider(logger, __dirname, options);

    expect(getInstanceSpy).not.toHaveBeenCalled();
    expect(options.credential).toBe(credential);
  });

  it("does not inject credentials when a container client is supplied", () => {
    const { mockContainerClient } = makeAzureStorageClientMocks();

    plugin.getProvider(logger, __dirname, { containerClient: mockContainerClient });

    expect(getInstanceSpy).not.toHaveBeenCalled();
  });
});
