import {
  isCorrectLogLevel,
  type Logger,
  logLevelsObject,
  type LogLevel,
} from "backfill-logger";
import type { Config } from "./Config.js";
import { getAzureBlobConfigFromSerializedOptions } from "./azureBlobCacheConfig.js";
import { getNpmConfigFromSerializedOptions } from "./npmCacheConfig.js";
import { isCorrectMode, modesObject, type BackfillModes } from "./modes.js";
import type {
  CacheStorageConfig,
  CustomCacheStorageConfig,
} from "./cacheConfig.js";

class BackfillConfigError extends Error {
  constructor(value: string, envName: string, expected: string) {
    super(
      `Backfill config option ${envName} was set to an invalid value.\n` +
        `Expected: ${expected}\nReceived: ${value}`
    );
  }
}

type EnvParser<T> = (value: string, envName: string) => T;

// TODO: possibly more validation should be added here
// https://github.com/microsoft/backfill/issues/540
const parseBoolean: EnvParser<boolean> = (value) => value === "true";
const parseString: EnvParser<string> = (value) => value;
const parseStringArray: EnvParser<string[]> = (value, envName) => {
  if (value.startsWith("[") && value.endsWith("]")) {
    try {
      return JSON.parse(value) as string[];
    } catch {
      // see next
    }
  }
  throw new BackfillConfigError(value, envName, "array of strings");
};
const parseLogLevel: EnvParser<LogLevel> = (value, envName) => {
  if (isCorrectLogLevel(value)) {
    return value as LogLevel;
  }
  const expected = `one of ${Object.keys(logLevelsObject).join(", ")}`;
  throw new BackfillConfigError(value, envName, expected);
};
const parseMode: EnvParser<BackfillModes> = (value, envName) => {
  if (isCorrectMode(value)) {
    return value as BackfillModes;
  }
  const expected = `one of ${Object.keys(modesObject).join(", ")}`;
  throw new BackfillConfigError(value, envName, expected);
};

const envOptions: {
  [K in keyof Omit<Config, "cacheStorageConfig">]: [
    string,
    EnvParser<Config[K]>,
  ];
} = {
  clearOutput: ["BACKFILL_CLEAR_OUTPUT", parseBoolean],
  internalCacheFolder: ["BACKFILL_INTERNAL_CACHE_FOLDER", parseString],
  logFolder: ["BACKFILL_LOG_FOLDER", parseString],
  logLevel: ["BACKFILL_LOG_LEVEL", parseLogLevel],
  name: ["BACKFILL_NAME", parseString],
  mode: ["BACKFILL_MODE", parseMode],
  outputGlob: ["BACKFILL_OUTPUT_GLOB", parseStringArray],
  packageRoot: ["BACKFILL_PACKAGE_ROOT", parseString],
  performanceReportName: ["BACKFILL_PERFORMANCE_REPORT_NAME", parseString],
  producePerformanceLogs: ["BACKFILL_PRODUCE_PERFORMANCE_LOGS", parseBoolean],
  validateOutput: ["BACKFILL_VALIDATE_OUTPUT", parseBoolean],
  incrementalCaching: ["BACKFILL_INCREMENTAL_CACHING", parseBoolean],
};

/**
 * Get the config from `process.env.BACKFILL_*`:
 * - `BACKFILL_CACHE_PROVIDER` for `Config.cacheStorageConfig.provider`
 * - `BACKFILL_CACHE_PROVIDER_OPTIONS` for `Config.cacheStorageConfig.options`
 * - For other `Config` properties, `BACKFILL_*` snake case version of option,
 *   e.g. `BACKFILL_LOG_LEVEL` for `Config.logLevel`
 *
 * Arrays and objects should be the `JSON.stringify`ed form of the value.
 */
export function getEnvConfig(logger: Logger): Partial<Config> {
  const config: Partial<Config> = {};

  const cacheProvider = process.env.BACKFILL_CACHE_PROVIDER as
    | Exclude<CacheStorageConfig["provider"], Function> // eslint-disable-line
    | "azure-blob" // legacy value, mapped to custom plugin
    | undefined;
  const serializedCacheProviderOptions =
    process.env.BACKFILL_CACHE_PROVIDER_OPTIONS;

  if (cacheProvider === "azure-blob") {
    const azureBlobConfig = getAzureBlobConfigFromSerializedOptions(
      serializedCacheProviderOptions || "{}"
    );
    // Map the legacy "azure-blob" provider to the new custom plugin config
    const customConfig: CustomCacheStorageConfig = {
      provider: "custom",
      plugin: "@lage-run/azure-blob-cache-storage",
      options: azureBlobConfig.options,
    };
    config.cacheStorageConfig = customConfig;
  } else if (cacheProvider === "npm") {
    config.cacheStorageConfig = getNpmConfigFromSerializedOptions(
      serializedCacheProviderOptions || "{}"
    );
  } else if (cacheProvider === "local" || cacheProvider === "local-skip") {
    config.cacheStorageConfig = { provider: cacheProvider };
  } else if (cacheProvider) {
    // TODO: In a future major version, this and the next case should throw
    // https://github.com/microsoft/backfill/issues/540
    logger.warn(`Ignoring unknown BACKFILL_CACHE_PROVIDER: "${cacheProvider}"`);
  } else if (serializedCacheProviderOptions) {
    logger.warn(
      `Ignoring unknown BACKFILL_CACHE_PROVIDER_OPTIONS: "${serializedCacheProviderOptions}"`
    );
  }

  for (const [key, [envVar, parser]] of Object.entries(envOptions)) {
    const envValue = process.env[envVar];
    if (envValue) {
      (config as Record<string, unknown>)[key] = parser(envValue, envVar);
    }
  }

  return config;
}
