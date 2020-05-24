import { getEnvConfig, createDefaultConfig } from "backfill-config";
import { makeLogger } from "backfill-logger";
import { RunContext } from "../types/RunContext";

export function getCacheConfig(cwd: string, context: RunContext) {
  const defaultCacheConfig = createDefaultConfig(cwd);

  // in lage, default mode is to SKIP locally
  defaultCacheConfig.cacheStorageConfig.provider = "local-skip";

  const logger = makeLogger("warn");
  const envConfig = getEnvConfig(logger);
  return {
    ...defaultCacheConfig,
    ...context.cacheOptions,
    ...envConfig,
  };
}
