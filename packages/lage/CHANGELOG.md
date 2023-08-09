# Change Log - lage

This log was last generated on Wed, 09 Aug 2023 18:41:19 GMT and should not be manually modified.

<!-- Start content -->

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
