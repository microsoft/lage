/**
 * Backfill wrappers: some functions that uses the `backfill` library that doesn't require them to be inside a class
 */

import * as os from "os";
import { createDefaultConfig, getEnvConfig } from "backfill-config";
import { makeLogger } from "backfill-logger";
import { CacheStorageConfig } from "backfill-config";
import type { Logger as BackfillLogger } from "backfill-logger";
import type { CacheOptions } from "./types/CacheOptions.js";
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
  // To avoid weakmap issues, we need to store the credential and restore post-merge
  const credentialStash = getCredentialStash(cacheOptions);

  const mergedConfig = {
    ...createDefaultConfig(cwd),
    ...cacheOptions,
    ...envConfig,
  };

  applyCredentialStashToMergedConfig(mergedConfig, credentialStash);

  return mergedConfig;
}

function getCredentialStash(cacheOptions: Partial<CacheOptions>) {
  if (
    cacheOptions.cacheStorageConfig &&
    cacheOptions.cacheStorageConfig.provider === "azure-blob" &&
    cacheOptions.cacheStorageConfig.options.credential
  ) {
    const stashedCredential = cacheOptions.cacheStorageConfig.options.credential;
    delete cacheOptions.cacheStorageConfig.options.credential;
    return stashedCredential;
  }
  return null;
}

function applyCredentialStashToMergedConfig(mergedConfig: any, credentialStash: any) {
  if (mergedConfig.cacheStorageConfig.provider === "azure-blob") {
    const connectionString = mergedConfig.cacheStorageConfig.options.connectionString;
    if (connectionString && !isTokenConnectionString(connectionString)) {
      mergedConfig.cacheStorageConfig.options.credential = credentialStash || CredentialCache.getInstance();
    }
  }
}

function isTokenConnectionString(connectionString: string) {
  return connectionString.includes("SharedAccessSignature");
}
