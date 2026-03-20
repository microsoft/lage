# Change Log - backfill

<!-- This log was last generated on Thu, 19 Mar 2026 23:52:35 GMT and should not be manually modified. -->

<!-- Start content -->

## 6.4.4

Thu, 19 Mar 2026 23:52:35 GMT

### Patches

- `backfill-cache`
  - Move backfill to lage repo (elcraig@microsoft.com)
- `backfill-config`
  - Move backfill to lage repo (elcraig@microsoft.com)
- `backfill-hasher`
  - Move backfill to lage repo (elcraig@microsoft.com)
- `backfill-logger`
  - Move backfill to lage repo (elcraig@microsoft.com)
- `backfill-utils-dotenv`
  - Move backfill to lage repo (elcraig@microsoft.com)
- `backfill`
  - Move backfill to lage repo (elcraig@microsoft.com)

## 6.4.3

Fri, 27 Feb 2026 00:49:04 GMT

### Minor changes

- `backfill-hasher`
  - Improve internal structure and remove excess exports. If you were using exports besides Hasher, please file an issue. (elcraig@microsoft.com)
  - Simplify internal logic, remove `@rushstack/package-deps-hash` dependency, and add exports for functions duplicated by lage (elcraig@microsoft.com)

### Patches

- `backfill-cache`
  - Move logic out of index file (no behavior change) (elcraig@microsoft.com)
- `backfill-hasher`
  - Update dependency workspace-tools to ^0.41.0 (email not defined)

## 6.4.2

Fri, 10 Oct 2025 00:20:02 GMT

### Patches

- `backfill-cache`
  - Make sure that the backfill cache copies files beginning with a . over during fetch calls (1581488+christiango@users.noreply.github.com)

## 6.4.1

Wed, 06 Aug 2025 08:17:18 GMT

### Patches

- `backfill-config`
  - Fix TokenCredentialLike type (elcraig@microsoft.com)

## 6.4.0

Wed, 06 Aug 2025 06:52:42 GMT

### Minor changes

- `backfill-config`
  - Remove all direct references to Azure types, update config validation, add docs (elcraig@microsoft.com)
  - Internally restructure into multiple files (elcraig@microsoft.com)
- `backfill-logger`
  - Export logLevelsObject (elcraig@microsoft.com)
- `backfill`
  - Re-export relevant types (elcraig@microsoft.com)
- `backfill-cache`
  - Remove unused dependency on `@azure/core-http` (elcraig@microsoft.com)

### Patches

- `backfill-config`
  - Update to typescript 4.7 (should have no significant emit changes) (elcraig@microsoft.com)
- `backfill-logger`
  - Update to typescript 4.7 (should have no significant emit changes) (elcraig@microsoft.com)
- `backfill`
  - Update to typescript 4.7 (should have no significant emit changes) (elcraig@microsoft.com)
- `backfill-cache`
  - Update to typescript 4.7 (should have no significant emit changes) (elcraig@microsoft.com)
- `backfill-hasher`
  - Update to typescript 4.7 (should have no significant emit changes) (elcraig@microsoft.com)
- `backfill-utils-dotenv`
  - Update to typescript 4.7 (should have no significant emit changes) (elcraig@microsoft.com)

## 6.3.1

Thu, 31 Jul 2025 22:24:07 GMT

### Patches

- Bump backfill-cache to v5.10.1
- Bump backfill-config to v6.6.1
- Bump backfill-hasher to v6.6.1

## 6.3.0

Sat, 29 Mar 2025 08:07:16 GMT

### Minor changes

- Update to typescript 4.5 internally, and update readme (elcraig@microsoft.com)
- Bump backfill-cache to v5.10.0
- Bump backfill-config to v6.6.0
- Bump backfill-hasher to v6.6.0
- Bump backfill-logger to v5.3.0
- Bump backfill-utils-dotenv to v5.3.0

## 6.2.4

Fri, 27 Dec 2024 21:00:44 GMT

### Patches

- Bump backfill-cache to v5.9.0
- Bump backfill-config to v6.5.0
- Bump backfill-hasher to v6.5.3

## 6.2.3

Sat, 01 Jun 2024 08:03:35 GMT

### Patches

- Bump backfill-cache to v5.8.1

## 6.2.2

Wed, 15 Nov 2023 23:08:02 GMT

### Patches

- Bump backfill-cache to v5.8.0
- Bump backfill-config to v6.4.2
- Bump backfill-hasher to v6.5.2

## 6.2.1

Tue, 05 Sep 2023 21:29:30 GMT

### Patches

- Update typescript to 4.3 (elcraig@microsoft.com)
- Bump backfill-cache to v5.7.1
- Bump backfill-config to v6.4.1
- Bump backfill-hasher to v6.5.1
- Bump backfill-logger to v5.2.1
- Bump backfill-utils-dotenv to v5.2.1

## 6.2.0

Tue, 05 Sep 2023 19:56:47 GMT

### Minor changes

- Require Node 14; add downlevel syntax compilation to ES2020 for Node 14 (elcraig@microsoft.com)
- Bump backfill-cache to v5.7.0
- Bump backfill-config to v6.4.0
- Bump backfill-hasher to v6.5.0
- Bump backfill-logger to v5.2.0
- Bump backfill-utils-dotenv to v5.2.0

## 6.1.27

Thu, 13 Apr 2023 20:28:21 GMT

### Patches

- Bump backfill-cache to v5.6.4

## 6.1.26

Thu, 08 Dec 2022 02:52:13 GMT

### Patches

- Update dependency execa to v5 (renovate@whitesourcesoftware.com)
- Bump backfill-cache to v5.6.3
- Bump backfill-config to v6.3.1
- Bump backfill-hasher to v6.4.5
- Bump backfill-utils-test to v5.1.3

## 6.1.25

Thu, 08 Dec 2022 02:12:15 GMT

### Patches

- Bump backfill-hasher to v6.4.4

## 6.1.24

Thu, 08 Dec 2022 00:58:32 GMT

### Patches

- Add missing dependency on `find-up` (elcraig@microsoft.com)

## 6.1.23

Sat, 17 Sep 2022 00:00:24 GMT

### Patches

- Bump backfill-hasher to v6.4.3

## 6.1.22

Fri, 16 Sep 2022 00:21:39 GMT

### Patches

- Bump backfill-cache to v5.6.2

## 6.1.17

Wed, 18 May 2022 12:15:03 GMT

### Patches

- Make incremental cache an opt-in option (vibailly@microsoft.com)

## 6.1.10

Tue, 12 Oct 2021 19:45:45 GMT

### Patches

- get correct name of the storage provider (kchau@microsoft.com)

## 6.1.9

Tue, 21 Sep 2021 22:29:42 GMT

### Patches

- Fix git root detection in worktrees (elcraig@microsoft.com)

## 6.1.6

Thu, 06 May 2021 13:46:20 GMT

### Patches

- opt-in to optimize cache size (vibailly@microsoft.com)

## 6.1.5

Tue, 27 Apr 2021 09:06:13 GMT

### Patches

- Bump @types/node from 13.13.35 to 14.14.41 (ronald.ndirangu@gmail.com)

## 6.1.3

Tue, 27 Apr 2021 08:32:03 GMT

### Patches

- Bump @types/fs-extra from 8.0.1 to 9.0.11 (ronald.ndirangu@gmail.com)

## 6.1.2

Tue, 27 Apr 2021 08:29:06 GMT

### Patches

- Bump find-up from 4.1.0 to 5.0.0 (ronald.ndirangu@gmail.com)

## 6.1.0

Tue, 01 Dec 2020 09:43:25 GMT

### Minor changes

- Bump typescript from 3.7.4 to 4.1.2 (bewegger@microsoft.com)

## 6.0.8

Tue, 01 Dec 2020 09:13:42 GMT

### Patches

- Run Prettier 2.2.0 (bewegger@microsoft.com)

## 6.0.7

Tue, 01 Dec 2020 09:06:20 GMT

### Patches

- Bump find-up from 4.1.0 to 5.0.0 (bewegger@microsoft.com)

## 6.0.6

Tue, 01 Dec 2020 09:03:22 GMT

### Patches

- Bump yargs to 16.1.1 (bewegger@microsoft.com)

## 6.0.4

Tue, 13 Oct 2020 08:40:08 GMT

### Patches

- Use workspace root instead of git root (bewegger@microsoft.com)

## 6.0.2

Tue, 18 Aug 2020 16:03:05 GMT

### Patches

- Update hash in test (bewegger@microsoft.com)

## 6.0.0

Tue, 09 Jun 2020 11:50:22 GMT

### Major changes

- always use ** for hashGlob (vibailly@tuta.io)
