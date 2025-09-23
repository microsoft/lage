/**
 * Backfill wrappers: some functions that uses the `backfill` library that doesn't require them to be inside a class
 */

import * as os from "os";
import { createDefaultConfig, getEnvConfig } from "backfill-config";
import { makeLogger } from "backfill-logger";
import type { Logger as BackfillLogger } from "backfill-logger";
import type { CacheOptions } from "@lage-run/config";
import type { AzureCredentialName } from "@lage-run/config";
import { CredentialCache } from "./CredentialCache.js";

export function createBackfillLogger() {
  const stdout = process.stdout;
  const stderr = process.stderr;
  return makeLogger("error", {
    console: {
      info(...args) {
        stdout.write(args.join(" ") + os.EOL);
      },
      warn(...args) {
        stderr.write(args.join(" ") + os.EOL);
      },
      error(...args) {
        stderr.write(args.join(" ") + os.EOL);
      },
    },
  });
}

export function createBackfillCacheConfig(cwd: string, cacheOptions: Partial<CacheOptions> = {}, backfillLogger: BackfillLogger) {
  const envConfig = getEnvConfig(backfillLogger);
  const mergedConfig = {
    ...createDefaultConfig(cwd),
    ...cacheOptions,
    ...envConfig,
  };

  if (mergedConfig.cacheStorageConfig.provider === "azure-blob") {
    const azureOptions = mergedConfig.cacheStorageConfig.options;
    if ("connectionString" in azureOptions && !isTokenConnectionString(azureOptions.connectionString)) {
      // Pass through optional credentialName from config to select a specific credential implementation
      // Type assertion: only the connection-string variant is augmented with credentialName in @lage-run/config
      const name = (azureOptions as { credentialName?: AzureCredentialName }).credentialName as string | undefined;
      if (name != null) {
        if (!CredentialCache.credentialNames.includes(name as AzureCredentialName)) {
          throw new Error(
            `Invalid cacheStorageConfig.options.credentialName: "${name}". Allowed values: ${CredentialCache.credentialNames.join(", ")}`
          );
        }
        azureOptions.credential = CredentialCache.getInstance(name as AzureCredentialName);
      } else {
        // No name provided: fall back to EnvironmentCredential
        azureOptions.credential = CredentialCache.getInstance();
      }
    }
  }

  return mergedConfig;
}

function isTokenConnectionString(connectionString: string) {
  return connectionString.includes("SharedAccessSignature");
}
