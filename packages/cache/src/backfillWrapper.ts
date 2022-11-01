/**
 * Backfill wrappers: some functions that uses the `backfill` library that doesn't require them to be inside a class
 */

import * as os from "os";
import { createDefaultConfig, getEnvConfig } from "backfill-config";
import { makeLogger } from "backfill-logger";
import type { Logger as BackfillLogger } from "backfill-logger";
import type { CacheOptions } from "./types/CacheOptions.js";

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
  return {
    ...createDefaultConfig(cwd),
    ...cacheOptions,
    ...envConfig,
  };
}
