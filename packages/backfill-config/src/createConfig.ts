import path from "path";
import type { Logger } from "backfill-logger";
import findUp from "find-up";
import pkgDir from "pkg-dir";
import type { Config } from "./Config.js";
import { getEnvConfig } from "./envConfig.js";
import { isCorrectMode } from "./modes.js";

/**
 * Read the config from `backfill.config.js` (in `fromPath` and/or parents)
 * if present, fill in defaults for any values not provided, and apply overrides
 * from environment variables.
 */
export function createConfig(logger: Logger, fromPath: string): Config {
  const defaultConfig = createDefaultConfig(fromPath);
  const fileBasedConfig: Partial<Config> = getSearchPaths(fromPath).reduce(
    (acc, configPath) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const config: Partial<Config> = require(configPath);

      // TODO: In the next major version, the complete validation from
      // envConfig should also be used here (it shouldn't be added outside a
      // major version to avoid suddenly throwing on existing configs)
      // https://github.com/microsoft/backfill/issues/540
      if (config.mode && !isCorrectMode(config.mode)) {
        throw `Backfill config option "mode" was set, but with an invalid value: "${config.mode}"`;
      }

      return { ...acc, ...config };
    },
    {}
  );

  const envBasedConfig = getEnvConfig(logger);

  return {
    ...defaultConfig,
    ...fileBasedConfig,
    ...envBasedConfig,
  };
}

/**
 * Create a default config for the package containing `fromPath`.
 */
export function createDefaultConfig(fromPath: string): Config {
  const packageRoot = pkgDir.sync(fromPath) || fromPath;
  const defaultCacheFolder = path.join(
    packageRoot,
    "node_modules/.cache/backfill"
  );
  const outputGlob = ["lib/**"];

  return {
    cacheStorageConfig: {
      provider: "local",
    },
    clearOutput: false,
    internalCacheFolder: defaultCacheFolder,
    logFolder: defaultCacheFolder,
    logLevel: "info",
    name: getName(packageRoot),
    mode: "READ_WRITE",
    outputGlob,
    packageRoot,
    producePerformanceLogs: false,
    validateOutput: false,
    incrementalCaching: false,
  };
}

/**
 * Get the package name from `<packageRoot>/package.json`.
 */
export function getName(packageRoot: string): string {
  return (
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require(path.join(packageRoot, "package.json")).name ||
    path.basename(path.dirname(packageRoot))
  );
}

/**
 * Get a list of `backfill.config.js` file paths, starting at `fromPath` and
 * searching upward.
 */
export function getSearchPaths(fromPath: string): string[] {
  const searchPaths: string[] = [];

  let nextPath: string | undefined = fromPath;
  while (nextPath) {
    const configLocation = findUp.sync("backfill.config.js", { cwd: nextPath });

    if (configLocation) {
      searchPaths.push(configLocation);
      nextPath = path.join(path.dirname(configLocation), "..");
    } else {
      nextPath = undefined;
    }
  }

  return searchPaths.reverse();
}
