---
sidebar_position: 5

title: 5. Remote Cache
---

As your repo grows in size and complexity, the build takes longer and longer even locally. `lage` elegantly provides an incremental build capability given a locally available cache. When we pair the caching capability of `lage` with a cloud storage provider, we can speed up local builds with remote cache made available by Continuous Integration, or CI, jobs.

The theory is that when the CI job runs, it'll produce a "last known good" cache to be uploaded in a cloud storage, like Azure Blob Storage. The remote cache has been made available both for build-over-build speed ups in future CI jobs, as well as the local first build scenario.

`lage` has a "fallback cache" mechanism. `lage` will look for cache in layers: first on disk, then on remote server. `lage` will fill the local cache with the remote one if there is a remote cache hit. Next, `lage` will save the locally built cache into the remote cache if the environment variable `LAGE_WRITE_REMOTE_CACHE` is set _and_ if the cache is not configured to use a local provider.

## Setting up remote cache - Azure Blob Storage

Follow these steps to set up a remote cache.

### 1. Upgrade to latest `lage`

See the [migration guide](Cookbook/migration.mdx) for more details.

```
yarn upgrade lage
```

### 2. Create `.env` and add to `.gitignore`

Create the file:

```
touch .env
```

Be sure to add it to your `.gitignore` to avoid checking in secrets!

```txt title=".gitignore"
.env
node_modules
lib
dist
```

### 3. Generate auth tokens from Azure storage account

Prerequisite is to have a working Storage Account with Blob Storage Container created. Note that container name, it'll be needed for Step 5.

1. Select the following for a **read-only** connection string:
2. Set the start & expiry time to something appropriate
3. Click "Generate SAS and connection string" button
4. Save the "connection string" - this is your **read-only** connection string
5. Click on "Access Keys" tab on the left
6. Click "show keys"
7. Save the "connection string" - this is your **read-write** connection string (alternatively, you can create a read-write SAS connection string)

### 4. Modify the `.env` file with the remote cache connection information

```txt title=".env"
## This is required as of right now
BACKFILL_CACHE_PROVIDER="azure-blob"

## READ-ONLY SAS
BACKFILL_CACHE_PROVIDER_OPTIONS={"connectionString":"the **read-only** connection string","container":"CONTAINER NAME"}
```

### 5. Create a "secret" in the CI system for a Read/Write token

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

:::note

### Uploading cache to a remote is _not_ the default

Without the `LAGE_WRITE_REMOTE_CACHE` environment variable, `lage` no longer uploads build caches to the remote server.

### Accessing environment variables

Lage picks up your `.env` file contents using [`dotenv`](https://www.npmjs.com/package/dotenv) utility under the hood (see [backfill-utils-dotenv implementation](https://github.com/microsoft/backfill/blob/03b0e808d978faebf7be922a3f87d764ad0efce2/packages/utils-dotenv/README.md)).

Need to access environment variables from the `.env` file in your application? You would need to setup a mechanism to inject them. Try using utilities like `dotenv` (for Node.js) or [`env-cmd`](https://www.npmjs.com/package/env-cmd) (for executing commands).

:::
