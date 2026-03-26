# Change Log - backfill-hasher

<!-- This log was last generated on Thu, 26 Mar 2026 19:53:28 GMT and should not be manually modified. -->

<!-- Start content -->

## 6.7.2

Thu, 26 Mar 2026 19:53:28 GMT

### Patches

- Use version of workspace-tools published from lage repo (elcraig@microsoft.com)
- Address promise lint issues (elcraig@microsoft.com)

## 6.7.1

Thu, 19 Mar 2026 23:52:35 GMT

### Patches

- Move backfill to lage repo (elcraig@microsoft.com)

## 6.7.0

Fri, 27 Feb 2026 00:49:04 GMT

### Minor changes

- Improve internal structure and remove excess exports. If you were using exports besides Hasher, please file an issue. (elcraig@microsoft.com)
- Simplify internal logic, remove `@rushstack/package-deps-hash` dependency, and add exports for functions duplicated by lage (elcraig@microsoft.com)

### Patches

- Update dependency workspace-tools to ^0.41.0 (email not defined)

## 6.6.3

Wed, 06 Aug 2025 08:17:18 GMT

### Patches

- Bump backfill-config to v6.7.1

## 6.6.2

Wed, 06 Aug 2025 06:52:42 GMT

### Patches

- Update to typescript 4.7 (should have no significant emit changes) (elcraig@microsoft.com)
- Bump backfill-config to v6.7.0
- Bump backfill-logger to v5.4.0

## 6.6.1

Thu, 31 Jul 2025 22:24:07 GMT

### Patches

- Bump backfill-config to v6.6.1

## 6.6.0

Sat, 29 Mar 2025 08:07:16 GMT

### Minor changes

- Update to typescript 4.5 internally (elcraig@microsoft.com)
- Bump backfill-config to v6.6.0
- Bump backfill-logger to v5.3.0

### Patches

- Update dependency workspace-tools to ^0.38.0 (email not defined)

## 6.5.3

Fri, 27 Dec 2024 21:00:44 GMT

### Patches

- Bump backfill-config to v6.5.0

## 6.5.2

Wed, 15 Nov 2023 23:08:02 GMT

### Patches

- Bump backfill-config to v6.4.2

## 6.5.1

Tue, 05 Sep 2023 21:29:30 GMT

### Patches

- Update typescript to 4.3 (elcraig@microsoft.com)
- Update dependency workspace-tools to ^0.35.0 (renovate@whitesourcesoftware.com)
- Remove unnecessary dependency on find-up (elcraig@microsoft.com)
- Bump backfill-config to v6.4.1
- Bump backfill-logger to v5.2.1

## 6.5.0

Tue, 05 Sep 2023 19:56:47 GMT

### Minor changes

- Require Node 14; add downlevel syntax compilation to ES2020 for Node 14 (elcraig@microsoft.com)
- Bump backfill-config to v6.4.0
- Bump backfill-logger to v5.2.0

## 6.4.5

Thu, 08 Dec 2022 02:52:13 GMT

### Patches

- Bump backfill-config to v6.3.1
- Bump backfill-utils-test to v5.1.3

## 6.4.4

Thu, 08 Dec 2022 02:12:15 GMT

### Patches

- Update dependency workspace-tools to ^0.29.0 (renovate@whitesourcesoftware.com)

## 6.4.3

Sat, 17 Sep 2022 00:00:24 GMT

### Patches

- Update workspace-tools to ^0.27.0 (elcraig@microsoft.com)

## 6.4.2

Wed, 24 Aug 2022 15:40:20 GMT

### Patches

- upgrade workspace-tools to ^0.26.3 (mahuangh@microsoft.com)

## 6.4.1

Fri, 10 Jun 2022 19:16:49 GMT

### Patches

- fixes windows to use the fast path as well (kchau@microsoft.com)

## 6.4.0

Fri, 10 Jun 2022 18:21:21 GMT

### Minor changes

- Adds a "fast path" for hashing files in a package by using a look up tree (kchau@microsoft.com)

## 6.3.0

Thu, 31 Mar 2022 05:28:57 GMT

### Minor changes

- Upgrading package-deps-hash version. (dzearing@microsoft.com)

## 6.2.9

Thu, 13 Jan 2022 19:46:10 GMT

### Patches

- fixing platform differences in a monorepo, added tests (kchau@microsoft.com)

## 6.2.8

Fri, 07 Jan 2022 21:26:53 GMT

### Patches

- bumps the workspace-tools (kchau@microsoft.com)

## 6.2.7

Fri, 07 Jan 2022 16:43:20 GMT

### Patches

- speeding up the hasher by reducing wasted calculations (kchau@microsoft.com)

## 6.2.5

Tue, 22 Jun 2021 14:38:58 GMT

### Patches

- Fix: files from a different package are included in the hash.
  (vibailly@microsoft.com)

## 6.2.2

Tue, 27 Apr 2021 08:32:03 GMT

### Patches

- Bump @types/fs-extra from 8.0.1 to 9.0.11 (ronald.ndirangu@gmail.com)

## 6.2.1

Fri, 23 Apr 2021 23:51:52 GMT

### Patches

- bumps workspace-tools to take advantage of the faster boot of the lib
  (34725+kenotron@users.noreply.github.com)

## 6.2.0

Tue, 01 Dec 2020 09:43:25 GMT

### Minor changes

- Bump typescript from 3.7.4 to 4.1.2 (bewegger@microsoft.com)

## 6.1.5

Tue, 01 Dec 2020 09:13:42 GMT

### Patches

- Run Prettier 2.2.0 (bewegger@microsoft.com)

## 6.1.4

Tue, 01 Dec 2020 09:06:20 GMT

### Patches

- Bump find-up from 4.1.0 to 5.0.0 (bewegger@microsoft.com)

## 6.1.3

Wed, 18 Nov 2020 10:47:24 GMT

### Patches

- fix phantom dependencies (vincent.bailly@microsoft.com)

## 6.1.2

Tue, 13 Oct 2020 08:40:08 GMT

### Patches

- Use workspace root instead of git root (bewegger@microsoft.com)

## 6.1.1

Mon, 31 Aug 2020 15:41:56 GMT

### Patches

- Update package-deps-hash (bewegger@microsoft.com)

## 6.1.0

Tue, 18 Aug 2020 16:03:05 GMT

### Minor changes

- Include file path in hash. Addresses a bug where file renames do not produce
  new hash. (bewegger@microsoft.com)

## 6.0.1

Fri, 17 Jul 2020 19:27:19 GMT

### Patches

- bumping workspace-tools to allow accepting a PREFFERRED_WORKSPACE_MANAGER when
  multiple lock files implementations exist in one repo (kchau@microsoft.com)

## 6.0.0

Tue, 09 Jun 2020 11:50:22 GMT

### Major changes

- always use \*\* as hash glob (vibailly@tuta.io)
