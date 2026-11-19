import type { Logger } from "backfill-logger";
import type {
  ICacheStorage,
  CustomCacheStoragePlugin,
  AzureBlobCacheStorageOptions,
  AzureBlobCacheStorageConnectionStringOptions,
} from "backfill-config";

import { AzureBlobCacheStorage } from "./AzureBlobCacheStorage.js";
import { CredentialCache, type AzureCredentialName } from "./CredentialCache.js";

export type AzureBlobPluginOptions = AzureBlobCacheStorageOptions & {
  /** Optional credential name for Azure Identity authentication. */
  credentialName?: AzureCredentialName;
};

function isTokenConnectionString(connectionString: string) {
  return connectionString.includes("SharedAccessSignature") || connectionString.includes("AccountKey");
}

const plugin: CustomCacheStoragePlugin<AzureBlobPluginOptions> = {
  name: "azure-blob",
  getProvider(logger: Logger, cwd: string, options: AzureBlobPluginOptions): ICacheStorage {
    // Handle credential injection for connection-string-based options
    if ("connectionString" in options && !isTokenConnectionString(options.connectionString)) {
      const connStringOptions = options as AzureBlobCacheStorageConnectionStringOptions & { credentialName?: AzureCredentialName };
      if (!connStringOptions.credential) {
        const credName = connStringOptions.credentialName ?? (process.env.AZURE_IDENTITY_CREDENTIAL_NAME || undefined);

        if (credName != null) {
          if (!CredentialCache.credentialNames.includes(credName as AzureCredentialName)) {
            throw new Error(`Invalid credentialName: "${credName}". Allowed values: ${CredentialCache.credentialNames.join(", ")}`);
          }
          connStringOptions.credential = CredentialCache.getInstance(credName as AzureCredentialName);
        } else {
          connStringOptions.credential = CredentialCache.getInstance();
        }
      }
    }

    return new AzureBlobCacheStorage(options, logger, cwd);
  },
};

export default plugin;
