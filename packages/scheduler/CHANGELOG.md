# Change Log - @lage-run/scheduler

This log was last generated on Tue, 30 May 2023 18:19:34 GMT and should not be manually modified.

<!-- Start content -->

## 1.1.3

Tue, 30 May 2023 18:19:34 GMT

### Patches

- Bind postMessage when passing into onMessage (altinokd@microsoft.com)

## 1.1.2

Fri, 26 May 2023 20:44:05 GMT

### Patches

- Bump @lage-run/worker-threads-pool to v0.8.0

## 1.1.1

Fri, 26 May 2023 01:09:04 GMT

### Patches

- Bump @lage-run/hasher to v1.0.1

## 1.1.0

Fri, 26 May 2023 00:17:46 GMT

### Minor changes

- Add onMessage handler for workers (altinokd@microsoft.com)

## 1.0.2

Thu, 25 May 2023 15:46:02 GMT

### Patches

- Do not read config in targetWorker, instead pass CacheOptions as part of workerdata (altinokd@microsoft.com)
- Bump @lage-run/config to v0.3.0

## 1.0.1

Fri, 19 May 2023 22:10:20 GMT

### Patches

- Bump @lage-run/worker-threads-pool to v0.7.1

## 1.0.0

Mon, 08 May 2023 22:27:16 GMT

### Major changes

- Now takes in a TargetHasher as a dep, but retains its own calls to cache provider (kchau@microsoft.com)
- Bump @lage-run/target-graph to v0.8.6
- Bump @lage-run/cache to v1.1.1
- Bump @lage-run/config to v0.2.1
- Bump @lage-run/hasher to v1.0.0
- Bump @lage-run/worker-threads-pool to v0.7.0
- Bump @lage-run/scheduler-types to v0.3.9

## 0.11.4

Wed, 26 Apr 2023 04:56:20 GMT

### Patches

- Bump @lage-run/config to v0.2.0

## 0.11.3

Tue, 25 Apr 2023 02:51:19 GMT

### Patches

- Update repository and homepage (elcraig@microsoft.com)
- Bump @lage-run/target-graph to v0.8.4
- Bump @lage-run/logger to v1.3.0
- Bump @lage-run/cache to v0.5.4
- Bump @lage-run/config to v0.1.4
- Bump @lage-run/worker-threads-pool to v0.6.1
- Bump @lage-run/scheduler-types to v0.3.8

## 0.11.2

Fri, 14 Apr 2023 04:37:55 GMT

### Patches

- Bump @lage-run/target-graph to v0.8.3
- Bump @lage-run/cache to v0.5.3
- Bump @lage-run/config to v0.1.3
- Bump @lage-run/scheduler-types to v0.3.7

## 0.11.1

Thu, 06 Apr 2023 22:27:50 GMT

### Patches

- Bump @lage-run/target-graph to v0.8.2
- Bump @lage-run/cache to v0.5.2
- Bump @lage-run/config to v0.1.2
- Bump @lage-run/scheduler-types to v0.3.6

## 0.11.0

Thu, 30 Mar 2023 23:46:52 GMT

### Minor changes

- moved caching to happen inside workers (kchau@microsoft.com)
- Bump @lage-run/worker-threads-pool to v0.6.0

## 0.10.5

Wed, 29 Mar 2023 22:41:49 GMT

### Patches

- moving config to its own package (kchau@microsoft.com)
- Bump @lage-run/worker-threads-pool to v0.5.1
- Bump @lage-run/scheduler-types to v0.3.5

## 0.10.4

Wed, 29 Mar 2023 20:02:40 GMT

### Patches

- Bump @lage-run/cache to v0.5.1

## 0.10.3

Mon, 27 Mar 2023 18:00:15 GMT

### Patches

- Bump @lage-run/cache to v0.5.0

## 0.10.2

Thu, 23 Mar 2023 19:32:03 GMT

### Patches

- Making SimpleScheduler more resilient to re-run requests that maybe come from target-graphs that are changing (kchau@microsoft.com)

## 0.10.1

Tue, 14 Mar 2023 00:28:38 GMT

### Patches

- Bump @lage-run/target-graph to v0.8.1
- Bump @lage-run/cache to v0.4.3
- Bump @lage-run/scheduler-types to v0.3.4

## 0.10.0

Fri, 10 Mar 2023 01:25:03 GMT

### Minor changes

- adding the ability to have a NoOp Task (kchau@microsoft.com)
- Bump @lage-run/target-graph to v0.8.0
- Bump @lage-run/cache to v0.4.2
- Bump @lage-run/scheduler-types to v0.3.3

## 0.9.2

Wed, 08 Mar 2023 17:35:28 GMT

### Patches

- Bump @lage-run/cache to v0.4.1

## 0.9.1

Wed, 08 Mar 2023 00:05:27 GMT

### Patches

- Bump @lage-run/target-graph to v0.7.0
- Bump @lage-run/cache to v0.4.0
- Bump @lage-run/scheduler-types to v0.3.2

## 0.9.0

Tue, 21 Feb 2023 21:30:37 GMT

### Minor changes

- cache directory to be centralized (kchau@microsoft.com)
- Bump @lage-run/cache to v0.3.0

## 0.8.5

Wed, 15 Feb 2023 16:51:15 GMT

### Patches

- Bump @lage-run/cache to v0.2.5

## 0.8.4

Wed, 15 Feb 2023 16:47:12 GMT

### Patches

- Bump @lage-run/target-graph to v0.6.2
- Bump @lage-run/cache to v0.2.4
- Bump @lage-run/scheduler-types to v0.3.1

## 0.8.3

Tue, 07 Feb 2023 23:52:48 GMT

### Patches

- migrating to V2 (kchau@microsoft.com)

## 0.8.2

Tue, 31 Jan 2023 23:54:49 GMT

### Patches

- fixed reporter to not log target status when it should not run at all (kchau@microsoft.com)

## 0.8.1

Fri, 27 Jan 2023 00:28:15 GMT

### Patches

- fixing profiler so that it will load correctly in the tracing UI (kchau@microsoft.com)

## 0.8.0

Wed, 18 Jan 2023 18:18:35 GMT

### Minor changes

- Using lage for prune and clear on cache and get reporter in shape for ADO (kchau@microsoft.com)
- Bump @lage-run/scheduler-types to v0.3.0

## 0.7.3

Thu, 05 Jan 2023 00:40:50 GMT

### Patches

- fixing progress bar to not be a bottleneck (kchau@microsoft.com)

## 0.7.2

Thu, 08 Dec 2022 00:49:28 GMT

### Patches

- sets the default to progress (kchau@microsoft.com)

## 0.7.1

Tue, 06 Dec 2022 00:48:02 GMT

### Patches

- creating the beginnings of a progress reporter - it's in beta (kchau@microsoft.com)
- Bump @lage-run/scheduler-types to v0.2.10

## 0.7.0

Mon, 05 Dec 2022 18:02:35 GMT

### Minor changes

- adding custom package.json script support (kchau@microsoft.com)

## 0.6.0

Mon, 21 Nov 2022 06:32:03 GMT

### Minor changes

- adding provision for the run() to pay attention to previous and currently running targetRun's (kchau@microsoft.com)
- Bump @lage-run/scheduler-types to v0.2.9

## 0.5.15

Fri, 18 Nov 2022 19:52:38 GMT

### Patches

- Bump @lage-run/cache to v0.2.3

## 0.5.14

Wed, 16 Nov 2022 20:07:05 GMT

### Patches

- Bump @lage-run/worker-threads-pool to v0.5.0

## 0.5.13

Wed, 16 Nov 2022 17:12:24 GMT

### Patches

- Bump @lage-run/worker-threads-pool to v0.4.5

## 0.5.12

Fri, 11 Nov 2022 07:29:47 GMT

### Patches

- Bump @lage-run/target-graph to v0.6.1
- Bump @lage-run/cache to v0.2.2
- Bump @lage-run/scheduler-types to v0.2.8

## 0.5.11

Thu, 10 Nov 2022 20:20:45 GMT

### Patches

- update api from targetgraphbuilder (kchau@microsoft.com)
- making swc the transpiler of choice (ken@gizzar.com)
- fixing real imports with rollup as well as getting rid of getPackageAndTask implementation details (kchau@microsoft.com)
- Bump @lage-run/target-graph to v0.6.0
- Bump @lage-run/cache to v0.2.1
- Bump @lage-run/scheduler-types to v0.2.7

## 0.5.10

Fri, 04 Nov 2022 21:14:01 GMT

### Patches

- fixed the tsconfig.lage2.json to output node16 moduleRes (kchau@microsoft.com)

## 0.5.9

Wed, 02 Nov 2022 20:45:00 GMT

### Patches

- switching from require() to import() where possible (ken@gizzar.com)

## 0.5.8

Wed, 02 Nov 2022 06:27:27 GMT

### Patches

- Bump @lage-run/cache to v0.2.0

## 0.5.7

Tue, 01 Nov 2022 22:48:33 GMT

### Patches

- get rid of third party abort-controller impl (kchau@microsoft.com)
- Bump @lage-run/worker-threads-pool to v0.4.4
- Bump @lage-run/scheduler-types to v0.2.6

## 0.5.6

Tue, 01 Nov 2022 22:25:59 GMT

### Patches

- adds import extensions of .js to prepare of esmodule switchover (kchau@microsoft.com)
- Bump @lage-run/target-graph to v0.5.3
- Bump @lage-run/logger to v1.2.2
- Bump @lage-run/cache to v0.1.28
- Bump @lage-run/worker-threads-pool to v0.4.3
- Bump @lage-run/scheduler-types to v0.2.5

## 0.5.5

Tue, 01 Nov 2022 20:43:17 GMT

### Patches

- cleaning up the tsconfig files (kchau@microsoft.com)
- Bump @lage-run/target-graph to v0.5.2
- Bump @lage-run/logger to v1.2.1
- Bump @lage-run/cache to v0.1.27
- Bump @lage-run/worker-threads-pool to v0.4.2
- Bump @lage-run/scheduler-types to v0.2.4

## 0.5.4

Mon, 31 Oct 2022 21:56:09 GMT

### Patches

- adds taskArgs param for worker scripts (kchau@microsoft.com)

## 0.5.3

Mon, 31 Oct 2022 21:27:52 GMT

### Patches

- adds depcheck and fixes (kchau@microsoft.com)
- Bump @lage-run/worker-threads-pool to v0.4.1
- Bump @lage-run/scheduler-types to v0.2.3

## 0.5.2

Sat, 29 Oct 2022 18:42:49 GMT

### Patches

- bump workspace-tools (ken@gizzar.com)
- Bump @lage-run/target-graph to v0.5.1
- Bump @lage-run/cache to v0.1.26
- Bump @lage-run/scheduler-types to v0.2.2

## 0.5.1

Sat, 29 Oct 2022 01:06:17 GMT

### Patches

- account for max worker idle memory limit (kchau@microsoft.com)
- Bump @lage-run/worker-threads-pool to v0.4.0
- Bump @lage-run/scheduler-types to v0.2.1

## 0.5.0

Wed, 26 Oct 2022 22:01:13 GMT

### Minor changes

- adds support for weighted targets (kchau@microsoft.com)
- Bump @lage-run/target-graph to v0.5.0
- Bump @lage-run/cache to v0.1.25
- Bump @lage-run/worker-threads-pool to v0.3.0
- Bump @lage-run/scheduler-types to v0.2.0

## 0.4.16

Wed, 26 Oct 2022 00:02:06 GMT

### Patches

- removing sharded targets - not the direction to go with jest support (kchau@microsoft.com)
- Bump @lage-run/target-graph to v0.4.5
- Bump @lage-run/cache to v0.1.24
- Bump @lage-run/scheduler-types to v0.1.16

## 0.4.15

Tue, 25 Oct 2022 00:06:49 GMT

### Patches

- Bump @lage-run/cache to v0.1.23
- Bump @lage-run/scheduler-types to v0.1.15

## 0.4.14

Mon, 24 Oct 2022 21:40:05 GMT

### Patches

- Bump @lage-run/cache to v0.1.22
- Bump @lage-run/scheduler-types to v0.1.14

## 0.4.13

Sun, 23 Oct 2022 04:31:57 GMT

### Patches

- add shard support (ken@gizzar.com)
- Bump @lage-run/target-graph to v0.4.4
- Bump @lage-run/cache to v0.1.21
- Bump @lage-run/scheduler-types to v0.1.13

## 0.4.12

Fri, 21 Oct 2022 21:36:38 GMT

### Patches

- uses new AggregatePool (ken@gizzar.com)
- Bump @lage-run/worker-threads-pool to v0.2.0
- Bump @lage-run/scheduler-types to v0.1.12

## 0.4.11

Fri, 21 Oct 2022 19:33:09 GMT

### Patches

- fixing ado logger (ken@gizzar.com)

## 0.4.10

Thu, 20 Oct 2022 00:22:27 GMT

### Patches

- Bump @lage-run/target-graph to v0.4.3
- Bump @lage-run/cache to v0.1.20
- Bump @lage-run/scheduler-types to v0.1.11

## 0.4.9

Wed, 12 Oct 2022 21:07:14 GMT

### Patches

- uses the separate package for formatting hrtime (kchau@microsoft.com)
- Bump @lage-run/format-hrtime to v0.1.1
- Bump @lage-run/scheduler-types to v0.1.10

## 0.4.8

Sat, 08 Oct 2022 19:11:01 GMT

### Patches

- remove unneeded dep (ken@gizzar.com)

## 0.4.7

Sat, 08 Oct 2022 18:44:41 GMT

### Patches

- remove unneeded dep (ken@gizzar.com)

## 0.4.6

Sat, 08 Oct 2022 17:43:37 GMT

### Patches

- adding a watch mode action (ken@gizzar.com)
- Bump @lage-run/scheduler-types to v0.1.9

## 0.4.5

Thu, 06 Oct 2022 16:07:29 GMT

### Patches

- Bump @lage-run/cache to v0.1.19
- Bump @lage-run/scheduler-types to v0.1.8

## 0.4.4

Thu, 06 Oct 2022 04:37:18 GMT

### Patches

- Bump @lage-run/worker-threads-pool to v0.1.7
- Bump @lage-run/scheduler-types to v0.1.7

## 0.4.3

Wed, 05 Oct 2022 23:59:29 GMT

### Patches

- Bump @lage-run/cache to v0.1.18
- Bump @lage-run/scheduler-types to v0.1.6

## 0.4.2

Wed, 05 Oct 2022 20:00:31 GMT

### Patches

- Bump @lage-run/cache to v0.1.17
- Bump @lage-run/scheduler-types to v0.1.5

## 0.4.1

Tue, 04 Oct 2022 20:18:09 GMT

### Patches

- Adds a nicer warning message for workers that isn't compatible (kchau@microsoft.com)

## 0.4.0

Tue, 04 Oct 2022 03:38:54 GMT

### Minor changes

- Brand new scheduler (ported p-graph over) (kchau@microsoft.com)
- Bump @lage-run/worker-threads-pool to v0.1.6
- Bump @lage-run/scheduler-types to v0.1.4

## 0.3.14

Mon, 03 Oct 2022 20:41:25 GMT

### Patches

- Bump @lage-run/worker-threads-pool to v0.1.5
- Bump @lage-run/scheduler-types to v0.1.3

## 0.3.13

Mon, 03 Oct 2022 19:57:28 GMT

### Patches

- Bump @lage-run/target-graph to v0.4.2
- Bump @lage-run/cache to v0.1.16
- Bump @lage-run/scheduler-types to v0.1.2

## 0.3.12

Mon, 03 Oct 2022 00:06:54 GMT

### Patches

- factoring out scheduler types to a new package (ken@gizzar.com)
- Bump @lage-run/scheduler-types to v0.1.1

## 0.3.11

Sat, 01 Oct 2022 16:21:41 GMT

### Patches

- Bump @lage-run/target-graph to v0.4.1
- Bump @lage-run/cache to v0.1.15

## 0.3.10

Sat, 01 Oct 2022 15:29:50 GMT

### Patches

- Bump @lage-run/target-graph to v0.4.0
- Bump @lage-run/cache to v0.1.14

## 0.3.9

Sat, 01 Oct 2022 06:41:42 GMT

### Patches

- Bump @lage-run/target-graph to v0.3.5
- Bump @lage-run/cache to v0.1.13

## 0.3.8

Sat, 01 Oct 2022 05:25:29 GMT

### Patches

- adds a stdio capture inside workerpool (ken@gizzar.com)
- Bump @lage-run/worker-threads-pool to v0.1.4

## 0.3.7

Fri, 30 Sep 2022 23:00:17 GMT

### Patches

- get rid of "node:" (kchau@microsoft.com)
- Bump @lage-run/worker-threads-pool to v0.1.3

## 0.3.6

Thu, 29 Sep 2022 21:54:45 GMT

### Patches

- Update dependency workspace-tools to ^0.28.0 (email not defined)
- Bump @lage-run/target-graph to v0.3.4
- Bump @lage-run/cache to v0.1.12

## 0.3.5

Mon, 19 Sep 2022 05:03:56 GMT

### Patches

- Bump @lage-run/target-graph to v0.3.3
- Bump @lage-run/cache to v0.1.11

## 0.3.4

Sat, 17 Sep 2022 20:20:49 GMT

### Patches

- Fixing logging in workerpools to not be out of order (ken@gizzar.com)
- Bump @lage-run/worker-threads-pool to v0.1.2

## 0.3.3

Sat, 17 Sep 2022 01:09:34 GMT

### Patches

- Update dependency workspace-tools to ^0.27.0 (email not defined)
- Bump @lage-run/target-graph to v0.3.2
- Bump @lage-run/cache to v0.1.10

## 0.3.2

Fri, 16 Sep 2022 01:32:24 GMT

### Patches

- Bump @lage-run/cache to v0.1.9

## 0.3.1

Tue, 06 Sep 2022 20:10:16 GMT

### Patches

- Bump @lage-run/target-graph to v0.3.1
- Bump @lage-run/cache to v0.1.8

## 0.3.0

Sun, 04 Sep 2022 23:00:20 GMT

### Minor changes

- Supports worker as a new target type (ken@gizzar.com)
- Bump @lage-run/target-graph to v0.3.0
- Bump @lage-run/logger to v1.2.0
- Bump @lage-run/cache to v0.1.7
- Bump @lage-run/worker-threads-pool to v0.1.1

## 0.2.0

Fri, 26 Aug 2022 06:34:51 GMT

### Minor changes

- caches the console output (ken@gizzar.com)

## 0.1.7

Wed, 24 Aug 2022 22:26:03 GMT

### Patches

- Update dependency @types/node to v14.18.26 (renovate@whitesourcesoftware.com)
- Bump @lage-run/target-graph to v0.2.2
- Bump @lage-run/logger to v1.1.3
- Bump @lage-run/cache to v0.1.6

## 0.1.6

Wed, 24 Aug 2022 16:23:48 GMT

### Patches

- Bump @lage-run/cache to v0.1.5

## 0.1.5

Wed, 24 Aug 2022 15:22:38 GMT

### Patches

- Update dependency workspace-tools to ^0.26.0 (renovate@whitesourcesoftware.com)
- Bump @lage-run/target-graph to v0.2.1
- Bump @lage-run/cache to v0.1.4

## 0.1.4

Tue, 23 Aug 2022 21:26:23 GMT

### Patches

- removed the rename of TargetRun (kchau@microsoft.com)

## 0.1.3

Tue, 23 Aug 2022 07:53:50 GMT

### Patches

- skip hidden target (start) from summary; fixes up the exit result handling (ken@gizzar.com)
- Bump @lage-run/logger to v1.1.2
- Bump @lage-run/cache to v0.1.3

## 0.1.2

Thu, 11 Aug 2022 23:52:59 GMT

### Patches

- updates the summary output of scheduler run for reports (kchau@microsoft.com)
- Bump @lage-run/logger to v1.1.1
- Bump @lage-run/cache to v0.1.2

## 0.1.1

Tue, 09 Aug 2022 21:16:28 GMT

### Patches

- brand new package to do scheduling of work (ken@gizzar.com)
- Bump @lage-run/target-graph to v0.2.0
- Bump @lage-run/cache to v0.1.1
