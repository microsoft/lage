# @lage-run/cache

This package provides:

1. `CacheProvider` interface
2. a default cache provider that uses [`backfill`](https://www.npmjs.com/package/backfill)

## Usage

The following example shows standalone cache usage. If you're using the `lage` CLI, provider creation is handled internally (though you can customize `cacheOptions` in `lage.config.js`).

```ts
import { BackfillCacheProvider, RemoteFallbackCacheProvider, TargetHasher, type CacheOptions } from "@lage-run/cache";
import { getWorkspaceManagerRoot } from "workspace-tools";

const cacheOptions: CacheOptions = {
  internalCacheFolder: ".cache",
  outputGlob: ["dist/**", "lib/**"]
}

const root = getWorkspaceManagerRoot(cwd);

const remoteFallbackCacheProviderOptions = {
  root,
  localCacheProvider: cacheOptions.skipLocalCache ? undefined : new BackfillCacheProvider({
    root,
    cacheOptions: {
      outputGlob: ["dist/**"]
    }
  }),

  remoteCacheProvider: new BackfillCacheProvider({
    root,
    {
      cacheStorageOptions: {
        provider: "azure-blob",
        options: {
          // This connection string can optionally contain credentials.
          // If no credentials are present, see credentialName below.
          connectionString: "asdfasdfasdfafds";
          container: "container";
          maxSize?: 150;
          // If connectionString doesn't have credentials, specify a supported credential type
          credentialName?: "environment"
        }
      },
      ...cacheOptions
      writeRemoteCache: true,
      outputGlob: ["dist/**", "lib/**"]
    },
    isReadOnly: cacheOptions.writeRemoteCache !== true,
  })
}

const cacheProvider = new RemoteFallbackCacheProvider(remoteFallbackCacheProviderOptions);
const hasher = new TargetHasher({
  root,
  environmentGlob: ["lage.config.js"],
  cacheKey: "some cache key",
})

let hash: string | null = null;
let cacheHit = false;

if (target.cache && !skipCaching) {
  hash = await hasher.hash(target, cliArgs);

  if (hash && !shouldResetCache) {
    cacheHit = await cacheProvider.fetch(hash, target);
  }
}

// DO TARGET RUN ACTIONS
// ...

await cacheProvider.put(hash, target);
```

## Differentiating cache

`CacheOptions.cacheKey` is included in the hash and can be used to differentiate the hash generated for the cache between different steps, or to invalidate the cache.

Example of usage in `lage.config.js`:

```js
module.exports = {
  cacheOptions: {
    cacheKey: "some cache key";
  }
}
```
