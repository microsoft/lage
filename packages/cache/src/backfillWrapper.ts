/**
 * Backfill wrappers: some functions that uses the `backfill` library that doesn't require them to be inside a class
 */

import * as os from "os";
import { type Config, createDefaultConfig, getEnvConfig } from "backfill-config";
import { makeLogger } from "backfill-logger";
import type { Logger as BackfillLogger } from "backfill-logger";
import type { CacheOptions } from "@lage-run/config";

export function createBackfillLogger(): BackfillLogger {
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

export function createBackfillCacheConfig(
  cwd: string,
  cacheOptions: Partial<CacheOptions> | undefined = {},
  backfillLogger: BackfillLogger
): Config {
  const envConfig = getEnvConfig(backfillLogger);
  const mergedConfig = {
    ...createDefaultConfig(cwd),
    ...cacheOptions,
    ...envConfig,
  } as Config;

  return mergedConfig;
}
