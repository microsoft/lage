# @lage-run/cache

This package provides:

1. `Cache` interface
2. a default cache provider that uses `backfill`

## Usage

```ts
const cacheOptions = {
  internalCacheFolder: ".cache",
  outputGlob: ["dist/**", "lib/**"]
}

const root = getWorkspaceRoot(cwd);

const options = {
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
          connectionString: "asdfasdfasdfafds";
          container: "container";
          maxSize?: 150;
        }
      },
      ...cacheOptions
      writeRemoteCache: true,
      outputGlob: ["dist/**", "lib/**"]
    },
    isReadOnly: cacheOptions.writeRemoteCache !== true,
  })
}

const cacheProvider = new RemoteBackfillFallbackCacheProvider(options);
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
