import type { LogLevel } from "backfill-logger";
import type { CacheStorageConfig } from "./cacheConfig.js";
import type { BackfillModes } from "./modes.js";

/** @deprecated not used */
export type HashGlobs = string[];

export type Config = {
  /**
   * Cache storage provider name and potentially configuration.
   * Defaults to `{ provider: "local" }`.
   */
  cacheStorageConfig: CacheStorageConfig;

  /**
   * Glob patterns for the built/generated files that should be hashed and
   * cached, relative to the root of each package.
   *
   * Example: To cache `package-a/lib` and `package-a/dist/bundles`, use
   * `outputGlob: ["lib/**\/*", "dist/bundles/**\/*"]`
   * (removing the backslashes--those are just for comment syntax parsing)
   *
   * Defaults to `["lib/**"]`.
   */
  outputGlob: string[];

  /**
   * Whether to delete the `outputGlob` files on completion.
   * @default false
   */
  clearOutput: boolean;

  /**
   * Absolute path to local cache folder.
   * @default "[packageRoot]/node_modules/.cache/backfill"
   */
  internalCacheFolder: string;

  /**
   * Absolute path to local log folder.
   * @default "[packageRoot]/node_modules/.cache/backfill"
   */
  logFolder: string;

  /**
   * Log level: `"silly" | "verbose" | "info" | "warn" | "error" | "mute"`
   * @default "info"
   */
  logLevel: LogLevel;

  /**
   * Name of the package, used for logging and performance reports.
   * Defaults to name from `package.json`.
   */
  name: string;

  /**
   * Cache operation mode: `"READ_ONLY" | "WRITE_ONLY" | "READ_WRITE" | "PASS"`
   * @default "READ_WRITE"
   */
  mode: BackfillModes;

  /**
   * Package root path.
   * Defaults to searching for `package.json` in the current working directory.
   */
  packageRoot: string;

  /**
   * If true, write performance logs to `logFolder`.
   * @default false
   */
  producePerformanceLogs: boolean;

  /**
   * If true, write the hash of the output files to the performance report.
   * @default false
   */
  validateOutput: boolean;

  /**
   * Compute hashes to only cache changed files.
   * @default false
   */
  incrementalCaching: boolean;

  /** @deprecated Appears unused */
  performanceReportName?: string;
};
