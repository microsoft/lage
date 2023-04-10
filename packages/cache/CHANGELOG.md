# Change Log - @lage-run/cache

This log was last generated on Thu, 06 Apr 2023 22:27:50 GMT and should not be manually modified.

<!-- Start content -->

## 0.5.2

Thu, 06 Apr 2023 22:27:50 GMT

### Patches

- Bump @lage-run/target-graph to v0.8.2

## 0.5.1

Wed, 29 Mar 2023 20:02:40 GMT

### Patches

- moving back to fast-glob for globbing, as it was more accurate (kchau@microsoft.com)
- Bump @lage-run/hasher to v0.2.2

## 0.5.0

Mon, 27 Mar 2023 18:00:15 GMT

### Minor changes

- gitignore to be respected again in the envglob - this causes major perf regression otherwise (kchau@microsoft.com)

## 0.4.3

Tue, 14 Mar 2023 00:28:38 GMT

### Patches

- Bump @lage-run/target-graph to v0.8.1

## 0.4.2

Fri, 10 Mar 2023 01:25:03 GMT

### Patches

- Bump @lage-run/target-graph to v0.8.0

## 0.4.1

Wed, 08 Mar 2023 17:35:28 GMT

### Patches

- deleted unused sortObjects (kchau@microsoft.com)
- Bump @lage-run/hasher to v0.2.1

## 0.4.0

Wed, 08 Mar 2023 00:05:27 GMT

### Minor changes

- allows global script cache (kchau@microsoft.com)
- Bump @lage-run/hasher to v0.2.0
- Bump @lage-run/target-graph to v0.7.0

## 0.3.0

Tue, 21 Feb 2023 21:30:37 GMT

### Minor changes

- cache directory to be centralized (kchau@microsoft.com)

## 0.2.5

Wed, 15 Feb 2023 16:51:15 GMT

### Patches

- Bump @lage-run/hasher to v0.1.3

## 0.2.4

Wed, 15 Feb 2023 16:47:12 GMT

### Patches

- bumping workspace-tools to latest to support yarn 3 (kchau@microsoft.com)
- Bump @lage-run/target-graph to v0.6.2

## 0.2.3

Fri, 18 Nov 2022 19:52:38 GMT

### Patches

- Bump @lage-run/hasher to v0.1.2

## 0.2.2

Fri, 11 Nov 2022 07:29:47 GMT

### Patches

- Bump @lage-run/target-graph to v0.6.1

## 0.2.1

Thu, 10 Nov 2022 20:20:45 GMT

### Patches

- Bump @lage-run/target-graph to v0.6.0

## 0.2.0

Wed, 02 Nov 2022 06:27:27 GMT

### Minor changes

- Now uses the @lage-run/hasher package (ken@gizzar.com)
- Bump @lage-run/hasher to v0.1.1

## 0.1.28

Tue, 01 Nov 2022 22:25:59 GMT

### Patches

- adds import extensions of .js to prepare of esmodule switchover (kchau@microsoft.com)
- Bump @lage-run/target-graph to v0.5.3
- Bump @lage-run/logger to v1.2.2

## 0.1.27

Tue, 01 Nov 2022 20:43:17 GMT

### Patches

- cleaning up the tsconfig files (kchau@microsoft.com)
- Bump @lage-run/target-graph to v0.5.2
- Bump @lage-run/logger to v1.2.1

## 0.1.26

Sat, 29 Oct 2022 18:42:49 GMT

### Patches

- bump workspace-tools (ken@gizzar.com)
- Bump @lage-run/target-graph to v0.5.1

## 0.1.25

Wed, 26 Oct 2022 22:01:13 GMT

### Patches

- Bump @lage-run/target-graph to v0.5.0

## 0.1.24

Wed, 26 Oct 2022 00:02:06 GMT

### Patches

- Bump @lage-run/target-graph to v0.4.5

## 0.1.23

Tue, 25 Oct 2022 00:06:49 GMT

### Patches

- recover the cache check to not bombard with file reads (kchau@microsoft.com)

## 0.1.22

Mon, 24 Oct 2022 21:40:05 GMT

### Patches

- Fixed salt to not have race conditions with env hash calculations (kchau@microsoft.com)

## 0.1.21

Sun, 23 Oct 2022 04:31:57 GMT

### Patches

- Bump @lage-run/target-graph to v0.4.4

## 0.1.20

Thu, 20 Oct 2022 00:22:27 GMT

### Patches

- Allows for target specific environmentGlob override (kchau@microsoft.com)
- Bump @lage-run/target-graph to v0.4.3

## 0.1.19

Thu, 06 Oct 2022 16:07:29 GMT

### Patches

- adding a bit more logging to cache puts for "silly" log level (ken@gizzar.com)

## 0.1.18

Wed, 05 Oct 2022 23:59:29 GMT

### Patches

- just a fix to which envrionment wins (kchau@microsoft.com)

## 0.1.17

Wed, 05 Oct 2022 20:00:31 GMT

### Patches

- fixes the backfill config for remote cache (kchau@microsoft.com)

## 0.1.16

Mon, 03 Oct 2022 19:57:28 GMT

### Patches

- Bump @lage-run/target-graph to v0.4.2

## 0.1.15

Sat, 01 Oct 2022 16:21:41 GMT

### Patches

- Bump @lage-run/target-graph to v0.4.1

## 0.1.14

Sat, 01 Oct 2022 15:29:50 GMT

### Patches

- Bump @lage-run/target-graph to v0.4.0

## 0.1.13

Sat, 01 Oct 2022 06:41:42 GMT

### Patches

- Bump @lage-run/target-graph to v0.3.5

## 0.1.12

Thu, 29 Sep 2022 21:54:45 GMT

### Patches

- Update dependency workspace-tools to ^0.28.0 (email not defined)
- Bump @lage-run/target-graph to v0.3.4

## 0.1.11

Mon, 19 Sep 2022 05:03:56 GMT

### Patches

- Bump @lage-run/target-graph to v0.3.3

## 0.1.10

Sat, 17 Sep 2022 01:09:34 GMT

### Patches

- Update dependency workspace-tools to ^0.27.0 (email not defined)
- Bump @lage-run/target-graph to v0.3.2

## 0.1.9

Fri, 16 Sep 2022 01:32:24 GMT

### Patches

- Update dependency mock-fs to v5.1.4 (renovate@whitesourcesoftware.com)

## 0.1.8

Tue, 06 Sep 2022 20:10:16 GMT

### Patches

- Bump @lage-run/target-graph to v0.3.1

## 0.1.7

Sun, 04 Sep 2022 23:00:20 GMT

### Patches

- Bump @lage-run/target-graph to v0.3.0
- Bump @lage-run/logger to v1.2.0

## 0.1.6

Wed, 24 Aug 2022 22:26:03 GMT

### Patches

- Update dependency @types/node to v14.18.26 (renovate@whitesourcesoftware.com)
- Bump @lage-run/target-graph to v0.2.2
- Bump @lage-run/logger to v1.1.3

## 0.1.5

Wed, 24 Aug 2022 16:23:48 GMT

### Patches

- Update backfill & backfill-hasher (mhuan13@gmail.com)

## 0.1.4

Wed, 24 Aug 2022 15:22:38 GMT

### Patches

- Update dependency workspace-tools to ^0.26.0 (renovate@whitesourcesoftware.com)
- Bump @lage-run/target-graph to v0.2.1

## 0.1.3

Tue, 23 Aug 2022 07:53:50 GMT

### Patches

- Fixing the local fallback logic (ken@gizzar.com)
- Bump @lage-run/logger to v1.1.2

## 0.1.2

Thu, 11 Aug 2022 23:52:59 GMT

### Patches

- Bump @lage-run/logger to v1.1.1

## 0.1.1

Tue, 09 Aug 2022 21:16:28 GMT

### Patches

- Gets the args from the cliArgs, not the target (ken@gizzar.com)
- Adds a @lage-run/cache for v2 refactoring (ken@gizzar.com)
- Bump @lage-run/target-graph to v0.2.0
