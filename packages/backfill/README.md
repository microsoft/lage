# backfill

A JavaScript caching library for reducing build time.

> ⚠️ As of 2025, `backfill` is primarily used as the caching layer for
> [`lage`](https://www.npmjs.com/package/lage). Most information about
> [options](#options) and [remote cache setup](#set-up-remote-cache) also
> applies to `lage`'s `cacheOptions` configuration.

- **🔌 Easy to install**: Simply wrap your build commands inside
  `backfill -- [command]`
- **☁️ Remote cache**: Store your cache on Azure Blob or as an npm package
- **⚙️ Fully configurable**: Smart defaults with cross-package and per-package
  configuration and environment variable overrides

_Prerequisites:_

- git
- package manager with lock file (for optimized hashing)

## Why

When you're working in a multi-package repo you don't want to re-build packages
that haven't changed. By wrapping your build scripts inside `backfill` you
enable storing and fetching of build output to and from a local or remote cache.

Backfill is based on two concepts:

1. **Hashing**: It will hash the files of a package, its dependencies and the
   build command
2. **Caching**: Using the hash key, it will look for build output from a local
   or remote cache. If there's a match, it will backfill the package using the
   cache. Otherwise, it will run the build command and persist the output to the
   cache.

## Usage - CLI

```
backfill -- [command]
```

Typically you would wrap your npm scripts inside `backfill`, like this:

```json
{
  "name": "package",
  "scripts": {
    "build": "backfill -- tsc -b"
  }
}
```

### `--audit`

Backfill can only bring back build output from the folders it was asked to
cache. A package that modifies or adds files outside of the cached folder will
not be brought back to the same state as when it was initially built. To help
you debug this you can add `--audit` to your `backfill` command. It will listen
to all file changes in your repo (it assumes you're in a git repo) while running
the build command and then report on any files that got changed outside of the
cache folder.

## Configuration

Backfill will look for `backfill.config.js` (CJS only) in the package it was
called from and parent folders, then combine those configs together.

To configure backfill, simply export a config object with the properties you
wish to override. All properties in are optional in the config file.

```js
/** @type {Partial<import("backfill").Config>} */
const config = {
  cacheStorageConfig: {
    provider: "custom",
    plugin: "@lage-run/azure-blob-cache-storage",
    options: { ... }
  },
  outputGlob: ["lib/**/*", "dist/bundles/**/*"]
};
module.exports = config;
```

### Options

Notable options:

- `outputGlob` (`string[]`): A list of glob patterns for the built/generated
  files that should be hashed and cached, relative to the root of each package.
  For example, if you want to cache `package-a/lib` and
  `package-a/dist/bundles`, you'd write
  `"outputGlob: ["lib/**/*", "dist/bundles/**/*"]`.
- `cacheStorageConfig`: See [set up remote cache](#set-up-remote-cache) below.

All options:

```ts
export type Config = {
  /**
   * Glob patterns for the built/generated files that should be hashed and
   * cached, relative to the root of each package. (see example above)
   *
   * Defaults to `["lib/**"]`.
   */
  outputGlob: string[];

  /**
   * Cache storage provider name and potentially configuration.
   * See below for details.
   * @default { provider: "local" }
   */
  cacheStorageConfig: CacheStorageConfig;

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
   * Log level.
   * @default "info"
   */
  logLevel: "silly" | "verbose" | "info" | "warn" | "error" | "mute";

  /**
   * Name of the package, used for logging and performance reports.
   * Defaults to name from `package.json`.
   */
  name: string;

  /**
   * Cache operation mode.
   * @default "READ_WRITE"
   */
  mode: "READ_ONLY" | "WRITE_ONLY" | "READ_WRITE" | "PASS";

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
};
```

### Environment variables

You can override configuration with environment variables. Backfill will also
look for a `.env`-file in the root of your repository, and load those into the
environment. This can be useful when you don't want to commit keys and secrets
to your remote cache, or if you want to commit a read-only cache access key in
the repo and override with a write and read access key in the PR build, for
instance.

- `BACKFILL_CACHE_PROVIDER`: Cache provider name
  (`Config.cacheStorageConfig.provider`)
- `BACKFILL_CACHE_PROVIDER_OPTIONS`: Cache provider options (the rest of
  `Config.cacheStorageConfig`)
- For other `Config` properties, `BACKFILL_*` snake case version of option, e.g.
  `BACKFILL_LOG_LEVEL` for `Config.logLevel`

## Set up remote cache

Backfill supports multiple cache storage providers:

- Local folder (`local`), the default option
- [Azure blob storage (plugin)](#azure-blob-storage)
- [NPM package (`npm`)](#npm-package)
- [Skip cache locally (`local-skip`)](#skipping-cache-locally)
- [Custom plugin (`custom`)](#custom-storage-plugins)
- [Custom inline provider](#custom-inline-providers)

### Azure Blob Storage

Azure Blob Storage cache is available as a plugin. First, install the plugin:

```
npm install @lage-run/azure-blob-cache-storage
```

To cache to Microsoft Azure Blob Storage, you need to provide a connection
string and the container name. If you are configuring via `backfill.config.js`,
use the following syntax:

```js
module.exports = {
  cacheStorageConfig: {
    provider: "custom",
    plugin: "@lage-run/azure-blob-cache-storage",
    options: {
      connectionString: "...",
      container: "...",
      maxSize: 12345,
    },
  },
};
```

Optionally, you can pass a `credential` along with a `connectionString` which
does not have a SAS token. This is useful if you want to use a managed identity
or interactive browser login. For example:

```js
import { InteractiveBrowserCredential } from "@azure/identity";

module.exports = {
  cacheStorageConfig: {
    provider: "custom",
    plugin: "@lage-run/azure-blob-cache-storage",
    options: {
      connectionString:
        "https://<your-storage-account-name>.blob.core.windows.net",
      credential: new InteractiveBrowserCredential(),
      container: "...",
      maxSize: 12345,
    },
  },
};
```

#### Azure Blob Storage options

- `connectionString`: retrieve this from the Azure Portal interface
- `container`: the name of the blob storage container
- `maxSize` (optional): max size of a single package cache, in the number of
  bytes
- `credential` (optional): one of the credential types from `@azure/identity`.
- `credentialName` (optional): name of the credential type to use for Azure
  Identity authentication. Supported values: `"azure-cli"`,
  `"managed-identity"`, `"visual-studio-code"`, `"environment"`,
  `"workload-identity"`.

You can also use environment variables for configuration (backward compatible):

```
BACKFILL_CACHE_PROVIDER="azure-blob"
BACKFILL_CACHE_PROVIDER_OPTIONS='{"connectionString":"...","container":"..."}'
```

### NPM package

To cache to an NPM package you need to provide a package name and the registry
URL of your package feed. This feed should probably be private. If you are
configuring via `backfill.config.js`, you can use the following syntax:

```js
module.exports = {
  cacheStorageConfig: {
    provider: "npm",
    options: {
      npmPackageName: "...",
      registryUrl: "...",
    },
  },
};
```

You can also provide a path to the `.npmrc` user config file, to provide auth
details related to your package feed using the `npmrcUserconfig` field in
`options`.

You can also configure NPM package cache using environment variables.

```
BACKFILL_CACHE_PROVIDER="npm"
BACKFILL_CACHE_PROVIDER_OPTIONS='{"npmPackageName":"...","registryUrl":"..."}'
```

### Skipping cache locally

Sometimes in a local build environment, it is useful to compare hashes to
determine whether to execute the task without having to explicitly use a
separate directory for the cache.

One caveat, this is using output that the task produced and one could possibly
modify the output on a local development environment. For this reason, this is
an opt-in behavior rather than the default.

The main benefit of using this strategy is a **significant** speed boost.
Backfill can skip file copying of the cached outputs if it can rely on the built
artifacts. Hashing is CPU-bound while caching is I/O-bound. Using this strategy
results in speed gains but at the cost of needing to trust the outputs have not
be altered by the user. While this usually is true, it is prudent to also
provide a command in your repository to clean the output along with the saved
hashes.

You can configure this from the `backfill.config.js` file this way:

```js
module.exports = {
  cacheStorageConfig: {
    provider: "local-skip",
  },
};
```

Like other cases, you can also use the environment variable to choose this
storage strategy:

```
BACKFILL_CACHE_PROVIDER="local-skip"
```

### Custom storage plugins

You can use a custom cache storage plugin by setting `provider` to `"custom"`
and specifying the `plugin` package name or path. The plugin module should
export a `CustomCacheStoragePlugin` as its default export.

```js
// backfill.config.js
/** @type {Partial<import("backfill").Config>} */
const config = {
  cacheStorageConfig: {
    provider: "custom",
    plugin: "my-custom-cache-plugin",
    options: {
      key1: "value1",
      key2: "value2",
    },
  },
};
module.exports = config;
```

A plugin module should have the following structure:

```js
// my-custom-cache-plugin/index.js
/** @type {import("backfill-config").CustomCacheStoragePlugin} */
const plugin = {
  name: "my-custom-cache",
  getProvider(logger, cwd, options) {
    return {
      async fetch(hash) {
        // some fetch logic
        return false;
      },
      async put(hash, filesToCache) {
        // some putting logic
      },
    };
  },
};
module.exports = plugin;
```

### Custom inline providers

It is also possible to use a custom storage provider inline. This allows ultimate
flexibility in how to handle cache fetching and putting.

Configure the custom cache provider this way:

```js
// @ts-check
// See the types for details of the signatures
/** @implements {import("backfill").ICacheStorage} */
class CustomStorageProvider {
  constructor(providerOptions, logger, cwd) {
    // do what is needed in regards to the options
  }

  async fetch(hash) {
    // some fetch logic
  }

  async put(hash, filesToCache) {
    // some putting logic
  }
}

// backfill.config.js
/** @type {Partial<import("backfill").Config>} */
const config = {
  cacheStorageConfig: {
    provider: (logger, cwd) =>
      new CustomStorageProvider(
        {
          key1: "value1",
          key2: "value2",
        },
        logger,
        cwd
      ),
  },
};
module.exports = config;
```

## API

Backfill provides an API to support more complex scenarios and performance
optimizations.

```js
const backfill = require("backfill/lib/api");

const packagePath = getPath(packageName);

const logger = backfill.makeLogger("verbose", process.stdout, process.stderr);
const packagehash = await backfill.computeHash(packagePath, logger);

const fetchSuccess = await backfill.fetch(packagePath, packageHash, logger);

if (!fetchSuccess) {
  await runBuildCommand();
  await backfill.put(packagePath, packageHash, logger);
}
```

## Performance logs

Backfill provides the option to output a JSON log file after each run with
performance metrics. Enable this by setting `producePerformanceLogs: true` in
`backfill.config.js`.
