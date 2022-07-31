# @lage-run/cache

This package provides:

1. `Cache` interface
2. a default cache provider that uses `backfill`

## Usage

```ts
const cacheOptions = {
  cacheStorageOptions: {
    provider: "azure-blob",
    options: {
      connectionString: "asdfasdfasdfafds";
      container: "container";
      maxSize?: 150;
    }
  },
  internalCacheFolder: ".cache"
  writeRemoteCache: true,
  outputGlob: ["dist/**", "lib/**"]
}

const root = getWorkspaceRoot(cwd);

const cacheProvider = new RemoteBackfillFallbackCacheProvider(root, cacheOptions);

let hash: string | null = null;
let cacheHit = false;

if (target.cache && userWantsToCache) {
  hash = await cacheProvider.hash(target, root, cacheOptions, cliArgs); 

  if (hash && !shouldResetCache) {
    cacheHit = await cacheProvider.fetch(hash, target.id, target.cwd, cacheOptions);
  }
}

// DO TARGET RUN ACTIONS
// ...

await cacheProvider.put(hash, target, cacheOptions);
```