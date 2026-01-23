# @lage-run/cache

This package provides:

1. `Cache` interface
2. a default cache provider that uses `backfill`

## Usage

```ts
import { BackfillCacheProvider, RemoteFallbackCacheProvider, TargetHasher } from "@lage-run/cache";
import { getWorkspaceManagerRoot } from "workspace-tools";

const cacheOptions = {
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
          connectionString: "asdfasdfasdfafds"; // Providing an un-authenitcated Blob Service Endpoint will force use of Azure EnvironmentCredential
          container: "container";
          maxSize?: 150;
          credentialName?: "environment-credential" // Default value or ignored if connectionString carries credentials
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

## Differentiating Cache

To specifically differentiate the hash generated for the cache, between different steps the parameter `cacheKey` can be used. The parameter will be a part of the hash generation for the cache, and generated hash can be altered by modifying the parameter.

### Usage

Add the parameter in your `lage.config.js` as follows

```ts
{
  cacheOptions: {
    cacheKey: "some cache key";
  }
}
```
