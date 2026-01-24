# Change Log - lage

<!-- This log was last generated on Thu, 15 Jan 2026 23:24:00 GMT and should not be manually modified. -->

<!-- Start content -->

## 2.14.16

Thu, 15 Jan 2026 23:24:00 GMT

### Patches

- `@lage-run/cache-github-actions`
  - Update dependency workspace-tools to v0.40.0 (renovate@whitesourcesoftware.com)
- `@lage-run/cli`
  - Update dependency workspace-tools to v0.40.0 (renovate@whitesourcesoftware.com)
  - Replace ProgressReporter as the default with a less fancy implementation (crhaglun@microsoft.com)
  - Add lint rule for no-floating-promises and fix several places (nemanjatesic@microsoft.com)
- `@lage-run/config`
  - Update dependency workspace-tools to v0.40.0 (renovate@whitesourcesoftware.com)
- `@lage-run/hasher`
  - Update dependency workspace-tools to v0.40.0 (renovate@whitesourcesoftware.com)
  - Add lint rule for no-floating-promises and fix several places (nemanjatesic@microsoft.com)
- `lage`
  - Update dependency workspace-tools to v0.40.0 (renovate@whitesourcesoftware.com)
- `@lage-run/target-graph`
  - Update dependency workspace-tools to v0.40.0 (renovate@whitesourcesoftware.com)
  - Add lint rule for no-floating-promises and fix several places (nemanjatesic@microsoft.com)
- `@lage-run/reporters`
  - Replace ProgressReporter as the default with a less fancy implementation (crhaglun@microsoft.com)
- `@lage-run/rpc`
  - Add lint rule for no-floating-promises and fix several places (nemanjatesic@microsoft.com)
- `@lage-run/scheduler`
  - Add lint rule for no-floating-promises and fix several places (nemanjatesic@microsoft.com)
- `@lage-run/worker-threads-pool`
  - Add lint rule for no-floating-promises and fix several places (nemanjatesic@microsoft.com)

## 2.14.15

Tue, 21 Oct 2025 23:42:35 GMT

### Minor changes

- `@lage-run/cli`
  - Add custom reporter capability to Lage (nemanjatesic@microsoft.com)
- `@lage-run/config`
  - Add custom reporter capability to Lage (nemanjatesic@microsoft.com)

## 2.14.14

Fri, 10 Oct 2025 07:48:07 GMT

### Patches

- `@lage-run/cache`
  - Update dependency backfill-cache to v5.11.2 (renovate@whitesourcesoftware.com)

## 2.14.13

Thu, 25 Sep 2025 18:00:51 GMT

**Potential breaking change**: For the `"azure-blob"` cache storage provider (`cacheOptions.cacheStorageConfig.provider` or `BACKFILL_CACHE_PROVIDER`), usage of [`DefaultAzureCredential`](https://learn.microsoft.com/en-us/azure/developer/javascript/sdk/authentication/credential-chains#use-defaultazurecredential-for-flexibility) has been removed.

If your `connectionString` in `cacheOptions.cacheStorageConfig.options` or `BACKFILL_CACHE_PROVIDER_OPTIONS` supplies a token or your credentials are provided as [environment variables](https://learn.microsoft.com/en-us/javascript/api/%40azure/identity/environmentcredential?view=azure-node-latest), nothing changes. Otherwise, you'll need to add a `credentialName` option (one of the type names formerly handled by the default credential, e.g. `'azure-cli'`) or a full `credential` object. `credentialName` can be added to the options object (either config file or env) or specified separately via `AZURE_IDENTITY_CREDENTIAL_NAME`. More advanced scenarios (such as chaining) with a `credential` object are only supported in `lage.config.js`.

### Minor changes

- `@lage-run/cache`
  - azure identity - specify azure credential instead of using DefaultAzureCredential (brunoru@microsoft.com)
- `@lage-run/config`
  - Enhance CredentialCache to support multiple Azure credential types and allow configuration of credentialName in cache options (brunoru@microsoft.com)

## 2.14.12

Tue, 16 Sep 2025 21:17:08 GMT

### Patches

- `@lage-run/cache`
  - Update dependency @azure/identity to ^4.12.0 (email not defined)

## 2.14.11

Mon, 01 Sep 2025 08:10:36 GMT

### Minor changes

- `@lage-run/cli`
  - Add merge logic for targetConfig (dannyvv@microsoft.com)
- `@lage-run/config`
  - Add merge logic for targetConfig (dannyvv@microsoft.com)
- `@lage-run/hasher`
  - Add merge logic for targetConfig (dannyvv@microsoft.com)
- `@lage-run/target-graph`
  - Add merge logic for targetConfig (dannyvv@microsoft.com)

## 2.14.10

Sun, 31 Aug 2025 08:08:39 GMT

### Patches

- `@lage-run/reporters`
  - Update dependency @ms-cloudpack/task-reporter to v0.17.4 (renovate@whitesourcesoftware.com)

## 2.14.9

Fri, 08 Aug 2025 08:10:13 GMT

### Patches

- `@lage-run/cli`
  - Call read/readdir when simulating file accesses (pgunasekara@microsoft.com)
- `@lage-run/reporters`
  - Update dependency @ms-cloudpack/task-reporter to v0.17.2 (email not defined)

## 2.14.8

Thu, 07 Aug 2025 08:10:10 GMT

### Patches

- Update backfill monorepo (email not defined)

## 2.14.7

Fri, 01 Aug 2025 08:10:15 GMT

### Patches

- Update backfill monorepo (renovate@whitesourcesoftware.com)
- Update dependencies (elcraig@microsoft.com)
- Update dependency workspace-tools to v0.38.4 (renovate@whitesourcesoftware.com)

## 2.14.4

Thu, 17 Apr 2025 08:10:01 GMT

### Patches

- Update backfill monorepo (renovate@whitesourcesoftware.com)
- Update dependency workspace-tools to v0.38.3 (email not defined)

## 2.14.2

Wed, 02 Apr 2025 08:10:04 GMT

### Patches

- Bundle with esbuild ^0.25.0 (email not defined)

## 2.14.0

Sat, 29 Mar 2025 02:16:38 GMT

### Minor changes

- cheat on optimization by leverage the fact that 'info' command is called before anything else ALWAYS in BXL (kchau@microsoft.com)

## 2.12.20

Sat, 15 Feb 2025 20:04:19 GMT

### Patches

- Bump @lage-run/cli to v0.28.0

## 2.12.19

Wed, 12 Feb 2025 00:08:30 GMT

### Patches

- Bump @lage-run/cli to v0.27.0

## 2.12.18

Wed, 12 Feb 2025 00:04:29 GMT

### Patches

- Bump @lage-run/cli to v0.26.0

## 2.12.17

Tue, 11 Feb 2025 05:40:29 GMT

### Patches

- Bump @lage-run/cli to v0.25.7

## 2.12.16

Mon, 10 Feb 2025 00:35:53 GMT

### Patches

- Bump @lage-run/cli to v0.25.6

## 2.12.12

Fri, 07 Feb 2025 02:50:58 GMT

### Patches

- Bump @lage-run/cli to v0.25.2

## 2.12.11

Tue, 04 Feb 2025 18:31:49 GMT

### Patches

- Bump @lage-run/cli to v0.25.1

## 2.12.10

Fri, 24 Jan 2025 23:04:32 GMT

### Patches

- Bump @lage-run/cli to v0.25.0

## 2.12.9

Thu, 23 Jan 2025 17:38:05 GMT

### Patches

- Bump @lage-run/cli to v0.24.13

## 2.12.8

Fri, 17 Jan 2025 21:57:32 GMT

### Patches

- Bump @lage-run/cli to v0.24.12

## 2.12.7

Wed, 15 Jan 2025 16:56:22 GMT

### Patches

- Bump @lage-run/cli to v0.24.11
- Bump @lage-run/runners to v1.2.1

## 2.12.6

Fri, 20 Dec 2024 19:42:00 GMT

### Patches

- Bump @lage-run/cli to v0.24.10

## 2.12.5

Thu, 19 Dec 2024 15:53:46 GMT

### Patches

- Bump @lage-run/cli to v0.24.9

## 2.12.4

Tue, 10 Dec 2024 23:38:54 GMT

### Patches

- Bump @lage-run/cli to v0.24.8

## 2.12.3

Mon, 09 Dec 2024 06:21:52 GMT

### Patches

- Bump @lage-run/cli to v0.24.7

## 2.12.2

Sun, 08 Dec 2024 00:07:28 GMT

### Patches

- Bump @lage-run/cli to v0.24.6

## 2.12.1

Wed, 04 Dec 2024 23:50:15 GMT

### Patches

- Bump @lage-run/cli to v0.24.5

## 2.12.0

Mon, 02 Dec 2024 17:23:22 GMT

### Minor changes

- adds the ability to create stagedTargets (kchau@microsoft.com)
- Bump @lage-run/cli to v0.24.4
- Bump @lage-run/runners to v1.2.0

## 2.11.15

Wed, 20 Nov 2024 08:12:37 GMT

### Patches

- Update dependency workspace-tools to v0.38.1 (email not defined)
- Bump @lage-run/cli to v0.24.3
- Bump @lage-run/runners to v1.1.2

## 2.11.14

Wed, 20 Nov 2024 02:43:43 GMT

### Patches

- Bump @lage-run/cli to v0.24.2
- Bump @lage-run/runners to v1.1.1

## 2.11.13

Mon, 18 Nov 2024 23:22:30 GMT

### Patches

- Bump @lage-run/cli to v0.24.1

## 2.11.12

Fri, 08 Nov 2024 19:45:09 GMT

### Patches

- Bump @lage-run/cli to v0.24.0
- Bump @lage-run/runners to v1.1.0

## 2.11.11

Fri, 08 Nov 2024 19:27:44 GMT

### Patches

- Bump @lage-run/cli to v0.23.11

## 2.11.10

Fri, 01 Nov 2024 08:07:38 GMT

### Patches

- Bump @lage-run/cli to v0.23.10
- Bump @lage-run/runners to v1.0.7

## 2.11.9

Tue, 22 Oct 2024 15:19:29 GMT

### Patches

- Update dependency workspace-tools to v0.37.0 (email not defined)
- Bump @lage-run/cli to v0.23.9
- Bump @lage-run/runners to v1.0.6

## 2.11.8

Mon, 21 Oct 2024 22:18:54 GMT

### Patches

- Bump @lage-run/cli to v0.23.8
- Bump @lage-run/runners to v1.0.5

## 2.11.7

Thu, 17 Oct 2024 20:33:04 GMT

### Patches

- Bump @lage-run/cli to v0.23.7
- Bump @lage-run/runners to v1.0.4

## 2.11.6

Fri, 11 Oct 2024 22:09:18 GMT

### Patches

- Bump @lage-run/cli to v0.23.6

## 2.11.5

Fri, 11 Oct 2024 19:49:15 GMT

### Patches

- fixing the lage-server by publishing the correct files (kchau@microsoft.com)

## 2.11.4

Thu, 10 Oct 2024 20:14:59 GMT

### Patches

- Bump @lage-run/cli to v0.23.5

## 2.11.3

Wed, 09 Oct 2024 17:20:33 GMT

### Patches

- Bump @lage-run/cli to v0.23.4

## 2.11.2

Tue, 08 Oct 2024 20:03:36 GMT

### Patches

- Bump @lage-run/cli to v0.23.3

## 2.11.1

Mon, 07 Oct 2024 19:33:13 GMT

### Patches

- Bump @lage-run/cli to v0.23.2

## 2.11.0

Fri, 04 Oct 2024 23:41:44 GMT

### Minor changes

- adds the exec --server capability that would launch the background server (kchau@microsoft.com)
- Bump @lage-run/cli to v0.23.1

## 2.10.2

Wed, 02 Oct 2024 20:26:19 GMT

### Patches

- Bump @lage-run/cli to v0.23.0
- Bump @lage-run/runners to v1.0.3

## 2.10.1

Fri, 27 Sep 2024 20:03:49 GMT

### Patches

- Bump @lage-run/cli to v0.22.0

## 2.10.0

Wed, 25 Sep 2024 20:28:10 GMT

### Minor changes

- Bump @lage-run/cli to v0.21.0

## 2.9.0

Fri, 13 Sep 2024 18:05:04 GMT

### Minor changes

- adds a lage-server binary (kchau@microsoft.com)
- Bump @lage-run/cli to v0.20.0
- Bump @lage-run/runners to v1.0.2

## 2.8.3

Wed, 11 Sep 2024 20:52:15 GMT

### Patches

- Bump @lage-run/cli to v0.19.3

## 2.8.2

Wed, 11 Sep 2024 20:30:48 GMT

### Patches

- yarn 4 (kchau@microsoft.com)
- Bump @lage-run/cli to v0.19.2

## 2.8.1

Sat, 07 Sep 2024 00:01:57 GMT

### Patches

- Bump @lage-run/cli to v0.19.1

## 2.8.0

Fri, 06 Sep 2024 20:03:01 GMT

### Minor changes

- Bump @lage-run/cli to v0.19.0

## 2.7.24

Wed, 04 Sep 2024 23:25:05 GMT

### Patches

- Bump @lage-run/cli to v0.18.1

## 2.7.23

Fri, 30 Aug 2024 18:40:09 GMT

### Patches

- Bump @lage-run/cli to v0.18.0

## 2.7.22

Wed, 28 Aug 2024 21:12:45 GMT

### Patches

- moving runners to its own package, fixing up imports (kchau@microsoft.com)
- Bump @lage-run/cli to v0.17.8
- Bump @lage-run/runners to v1.0.1

## 2.7.21

Tue, 25 Jun 2024 22:03:40 GMT

### Patches

- Bump @lage-run/cli to v0.17.7
- Bump @lage-run/scheduler to v1.2.7

## 2.7.20

Tue, 25 Jun 2024 18:25:19 GMT

### Patches

- Bump @lage-run/cli to v0.17.6
- Bump @lage-run/scheduler to v1.2.6

## 2.7.19

Tue, 25 Jun 2024 18:10:57 GMT

### Patches

- bumps the esbuild (kchau@microsoft.com)
- Bump @lage-run/cli to v0.17.5
- Bump @lage-run/scheduler to v1.2.5

## 2.7.18

Tue, 18 Jun 2024 00:31:29 GMT

### Patches

- Bump @lage-run/cli to v0.17.4
- Bump @lage-run/scheduler to v1.2.4

## 2.7.17

Mon, 10 Jun 2024 23:50:39 GMT

### Patches

- Bump @lage-run/cli to v0.17.3
- Bump @lage-run/scheduler to v1.2.3

## 2.7.16

Thu, 23 May 2024 18:15:05 GMT

### Patches

- Update backfill monorepo (renovate@whitesourcesoftware.com)
- Bump @lage-run/cli to v0.17.2
- Bump @lage-run/scheduler to v1.2.2

## 2.7.15

Sun, 05 May 2024 22:55:45 GMT

### Patches

- fixing hashing issues related to rust panic (kchau@microsoft.com)
- Bump @lage-run/cli to v0.17.1
- Bump @lage-run/scheduler to v1.2.1

## 2.7.14

Tue, 23 Apr 2024 22:21:27 GMT

### Patches

- Bump @lage-run/cli to v0.17.0
- Bump @lage-run/scheduler to v1.2.0

## 2.7.13

Fri, 15 Mar 2024 04:35:11 GMT

### Patches

- Bump @lage-run/cli to v0.16.7
- Bump @lage-run/scheduler to v1.1.13

## 2.7.12

Mon, 26 Feb 2024 16:18:50 GMT

### Patches

- Bump @lage-run/cli to v0.16.6

## 2.7.11

Thu, 21 Dec 2023 09:49:09 GMT

### Patches

- Pin external deps to ensure explicit updates to lage bundle (elcraig@microsoft.com)
- Bump @lage-run/cli to v0.16.5
- Bump @lage-run/scheduler to v1.1.12

## 2.7.10

Thu, 21 Dec 2023 08:37:41 GMT

### Patches

- Bump @lage-run/cli to v0.16.4
- Bump @lage-run/scheduler to v1.1.11

## 2.7.9

Tue, 12 Dec 2023 04:22:41 GMT

### Patches

- Upgrade workspace-tools package to latest (stchur@microsoft.com)
- Bump @lage-run/cli to v0.16.3
- Bump @lage-run/scheduler to v1.1.10

## 2.7.8

Tue, 05 Sep 2023 22:23:23 GMT

### Patches

- Bump @lage-run/cli to v0.16.2
- Bump @lage-run/scheduler to v1.1.9

## 2.7.7

Tue, 05 Sep 2023 22:19:29 GMT

### Patches

- Update backfill dependencies (elcraig@microsoft.com)
- Bump @lage-run/cli to v0.16.1
- Bump @lage-run/scheduler to v1.1.8

## 2.7.6

Wed, 09 Aug 2023 18:41:19 GMT

### Patches

- Bump @lage-run/cli to v0.16.0

## 2.7.5

Mon, 17 Jul 2023 15:14:04 GMT

### Patches

- Update lage core deps (email not defined)
- Bump @lage-run/cli to v0.15.13
- Bump @lage-run/scheduler to v1.1.7

## 2.7.4

Tue, 11 Jul 2023 14:51:52 GMT

### Patches

- Bump @lage-run/cli to v0.15.12
- Bump @lage-run/scheduler to v1.1.6

## 2.7.3

Wed, 21 Jun 2023 19:06:25 GMT

### Patches

- Bump @lage-run/cli to v0.15.11
- Bump @lage-run/scheduler to v1.1.5

## 2.7.2

Thu, 15 Jun 2023 17:04:58 GMT

### Patches

- Bump @lage-run/cli to v0.15.10
- Bump @lage-run/scheduler to v1.1.4

## 2.7.1

Tue, 30 May 2023 18:19:34 GMT

### Patches

- Bump @lage-run/cli to v0.15.9
- Bump @lage-run/scheduler to v1.1.3

## 2.7.0

Fri, 26 May 2023 20:44:05 GMT

### Minor changes

- Dynamic pooling by firing up 2 workers as a start, then adding new workers as work comes in (kchau@microsoft.com)
- Bump @lage-run/cli to v0.15.8
- Bump @lage-run/scheduler to v1.1.2

## 2.6.6

Fri, 26 May 2023 01:09:04 GMT

### Patches

- Bump @lage-run/cli to v0.15.7
- Bump @lage-run/scheduler to v1.1.1

## 2.6.5

Fri, 26 May 2023 00:17:46 GMT

### Patches

- Bump @lage-run/cli to v0.15.6
- Bump @lage-run/scheduler to v1.1.0

## 2.6.4

Thu, 25 May 2023 15:46:02 GMT

### Patches

- Bump @lage-run/cli to v0.15.5
- Bump @lage-run/scheduler to v1.0.2

## 2.6.3

Fri, 19 May 2023 22:10:20 GMT

### Patches

- Bump @lage-run/cli to v0.15.4
- Bump @lage-run/scheduler to v1.0.1

## 2.6.2

Fri, 12 May 2023 06:12:34 GMT

### Patches

- Bump @lage-run/cli to v0.15.3

## 2.6.1

Tue, 09 May 2023 20:03:32 GMT

### Patches

- switching to using esbuild to bundle instead to make the bundling super fast (kchau@microsoft.com)

## 2.6.0

Mon, 08 May 2023 22:27:16 GMT

### Minor changes

- Swapped to using a target hasher that is capable of hashing a target at a time, with support for inputs (kchau@microsoft.com)
- Bump @lage-run/cli to v0.15.2
- Bump @lage-run/scheduler to v1.0.0

## 2.5.6

Mon, 08 May 2023 16:33:24 GMT

### Patches

- Bump @lage-run/cli to v0.15.1

## 2.5.5

Wed, 26 Apr 2023 04:56:20 GMT

### Patches

- Update readme (elcraig@microsoft.com)
- Bump @lage-run/cli to v0.15.0
- Bump @lage-run/scheduler to v0.11.4

## 2.5.4

Tue, 25 Apr 2023 02:51:19 GMT

### Patches

- Update repository and homepage (elcraig@microsoft.com)
- Bump @lage-run/cli to v0.14.0
- Bump @lage-run/scheduler to v0.11.3

## 2.5.3

Fri, 14 Apr 2023 04:37:55 GMT

### Patches

- making lage boot faster (kchau@microsoft.com)
- Bump @lage-run/cli to v0.13.2
- Bump @lage-run/scheduler to v0.11.2

## 2.5.2

Thu, 06 Apr 2023 22:27:50 GMT

### Patches

- bumps workspace-tools and use async packageinfos (kchau@microsoft.com)
- Bump @lage-run/cli to v0.13.1
- Bump @lage-run/scheduler to v0.11.1

## 2.5.1

Tue, 04 Apr 2023 20:00:55 GMT

### Patches

- Fixed a bundling issue where cache was no longer working due to exportConditions problem in rollup's node plugin (kchau@microsoft.com)

## 2.5.0

Sat, 01 Apr 2023 00:28:31 GMT

### Minor changes

- replace ink with @ms-cloudpack/task-reporter (kchau@microsoft.com)
- Bump @lage-run/cli to v0.13.0

## 2.4.0

Thu, 30 Mar 2023 23:46:52 GMT

### Minor changes

- moved caching to happen inside workers (kchau@microsoft.com)
- Bump @lage-run/cli to v0.12.0
- Bump @lage-run/scheduler to v0.11.0

## 2.3.5

Thu, 30 Mar 2023 17:59:50 GMT

### Patches

- sync deps of glob-hasher (kchau@microsoft.com)

## 2.3.4

Wed, 29 Mar 2023 22:41:49 GMT

### Patches

- Bump @lage-run/cli to v0.11.4
- Bump @lage-run/scheduler to v0.10.5

## 2.3.3

Wed, 29 Mar 2023 20:02:40 GMT

### Patches

- Bump @lage-run/cli to v0.11.3
- Bump @lage-run/scheduler to v0.10.4

## 2.3.2

Mon, 27 Mar 2023 18:00:15 GMT

### Patches

- Bump @lage-run/cli to v0.11.2
- Bump @lage-run/scheduler to v0.10.3

## 2.3.1

Thu, 23 Mar 2023 19:32:03 GMT

### Patches

- Bump @lage-run/cli to v0.11.1
- Bump @lage-run/scheduler to v0.10.2

## 2.3.0

Wed, 22 Mar 2023 17:26:54 GMT

### Minor changes

- Add bundled config types to lage package (elcraig@microsoft.com)
- Bump @lage-run/cli to v0.11.0

## 2.2.3

Tue, 14 Mar 2023 00:28:38 GMT

### Patches

- Bump @lage-run/cli to v0.10.1
- Bump @lage-run/scheduler to v0.10.1

## 2.2.2

Fri, 10 Mar 2023 01:25:03 GMT

### Patches

- Bump @lage-run/cli to v0.10.0
- Bump @lage-run/scheduler to v0.10.0

## 2.2.1

Wed, 08 Mar 2023 17:35:28 GMT

### Patches

- Bump @lage-run/cli to v0.9.2
- Bump @lage-run/scheduler to v0.9.2

## 2.2.0

Wed, 08 Mar 2023 00:05:27 GMT

### Minor changes

- allows global script cache (kchau@microsoft.com)
- Bump @lage-run/cli to v0.9.1
- Bump @lage-run/scheduler to v0.9.1

## 2.1.0

Tue, 21 Feb 2023 21:30:37 GMT

### Minor changes

- centralized the cache directory (kchau@microsoft.com)
- Bump @lage-run/cli to v0.9.0
- Bump @lage-run/scheduler to v0.9.0

## 2.0.4

Sat, 18 Feb 2023 00:43:33 GMT

### Patches

- Bump @lage-run/cli to v0.8.6

## 2.0.3

Sat, 18 Feb 2023 00:40:18 GMT

### Patches

- Bump @lage-run/cli to v0.8.5

## 2.0.2

Wed, 15 Feb 2023 16:51:15 GMT

### Patches

- Bump @lage-run/cli to v0.8.4
- Bump @lage-run/scheduler to v0.8.5

## 2.0.1

Wed, 15 Feb 2023 16:47:12 GMT

### Patches

- Bump @lage-run/cli to v0.8.3
- Bump @lage-run/scheduler to v0.8.4

## 2.0.0

Tue, 07 Feb 2023 23:52:48 GMT

### Breaking changes

- Lage v2 requires **Node 16** or passing the `--experimental-abortcontroller` flag in Node 14.
- `lage` now will automatically write remote cache if the typical environment variable is set (e.g. `CI` or `TF_BUILD`)
- `info` command is not implemented yet
- `graph` command is not implemented yet

### Features

See the [release notes](./RELEASE.md) and [migration guide](https://microsoft.github.io/lage/docs/Cookbook/migration) for more information about what's new in v2.
