import { getEnvConfig, createDefaultConfig } from "backfill-config";
import { makeLogger } from "backfill-logger";
import { Config } from "../types/Config";

export function getCacheConfig(cwd: string, config: Config) {
  const defaultCacheConfig = createDefaultConfig(cwd);

  // in lage, default mode is to SKIP locally
  defaultCacheConfig.cacheStorageConfig.provider = "local-skip";

  const logger = makeLogger("warn");
  const envConfig = getEnvConfig(logger);
  return {
    ...defaultCacheConfig,
    ...config.cacheOptions,
    ...envConfig,
  };
}
