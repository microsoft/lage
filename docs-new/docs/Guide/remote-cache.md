---
sidebar_position: 5

title: Remote Cache
---

# Remote Cache

As your repo grows in size and complexity, the build takes longer and longer even locally. `lage` elegantly provides an incremental build capability given a locally available cache. When we pair the caching capability of `lage` with a cloud storage provider, we can speed up local builds with remote cache made available by Continuous Integration, or CI, jobs. 

The theory is that when the CI job runs, it'll produce a "last known good" cache to be uploaded in a cloud storage, like Azure Blob Storage. The remote cache has been made available both for build-over-build speed ups in future CI jobs, as well as the local first build scenario.

`lage` has a "fallback cache" mechansim. `lage` will look for cache in layers: first on disk, then on remote server. `lage` will fill the local cache with the remote one if there is a remote cache hit. Next, `lage` will save the locally built cache into the remote cache if the environment variable `LAGE_WRITE_REMOTE_CACHE` is set _and_ if the cache is not configured to use a local provider.

# Setting up remote cache - Azure Blob Storage

Follow these steps to set up a remote cache 

## 1. Make sure to upgrade to latest `lage` (v1.0.0+)

See [migration guide](./migration)

```
$ yarn upgrade lage
```

## 2. Add `dotenv` as a dependency (for convenience, locally)

```
$ yarn add -D dotenv
```

## 3. Add `.env` in your `.gitignore` to make sure not to check those environment variables in

```
$ touch .env
```

```
# .gitignore

.env
node_modules
lib
dist
```

## 4. Generate auth tokens from Azure storage account:

Prerequisite is to have a working Storage Account with Blob Storage Container created. Note that container name, it'll be needed for Step 5.

1. Select the following for a **read-only** connection string:
2. Set the start & expiry time to something appropriate
3. Click "Generate SAS and connection string" button
4. Save the "connection string" - this is your **read-only** connection string
5. Click on "Access Keys" tab on the left
6. Click "show keys"
7. Save the "connection string" - this is your **read-write** connection string (alternatively, you can create a read-write SAS connection string)

## 5. Modify the `.env` file with the remote cache connection information

```
# .env file contents

## This is required as of right now
BACKFILL_CACHE_PROVIDER="azure-blob"

## READ-ONLY SAS
BACKFILL_CACHE_PROVIDER_OPTIONS={"connectionString":"the **read-only** connection string","container":"CONTAINER NAME"}
```

## 6. Create a "secret" in the CI system for a Read/Write token

Here's an example snippet of Github Action with the correct environment variable set:

```yaml
- run: yarn lage build test --verbose
  env:
    BACKFILL_CACHE_PROVIDER: azure-blob
    BACKFILL_CACHE_PROVIDER_OPTIONS: ${{ secrets.BACKFILL_CACHE_PROVIDER_OPTIONS }}
    LAGE_WRITE_REMOTE_CACHE: true
```

Create a secret named "BACKFILL_CACHE_PROVIDER_OPTIONS":

```
{"connectionString":"the **read-write** connection string","container":"CONTAINER NAME"}
```

> Please note that without that `LAGE_WRITE_REMOTE_CACHE` environment variable, `lage` no longer uploads build caches to the remote server.