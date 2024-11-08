# Change Log - @lage-run/target-graph

<!-- This log was last generated on Fri, 08 Nov 2024 19:45:09 GMT and should not be manually modified. -->

<!-- Start content -->

## 0.10.0

Fri, 08 Nov 2024 19:45:09 GMT

### Minor changes

- add "shouldRun()" config to the target config (kchau@microsoft.com)

## 0.9.3

Tue, 22 Oct 2024 15:19:29 GMT

### Patches

- Update dependency workspace-tools to v0.37.0 (email not defined)

## 0.9.2

Mon, 21 Oct 2024 22:18:54 GMT

### Patches

- Optimize transitive reduction (ronakjain.public@gmail.com)

## 0.9.1

Thu, 17 Oct 2024 20:33:04 GMT

### Patches

- Optimize subgraph build (ronakjain.public@gmail.com)

## 0.9.0

Wed, 02 Oct 2024 20:26:19 GMT

### Minor changes

- add optimization functions for the graph (kchau@microsoft.com)

## 0.8.10

Fri, 13 Sep 2024 18:05:04 GMT

### Patches

- lage-server work (kchau@microsoft.com)

## 0.8.9

Thu, 21 Dec 2023 09:49:09 GMT

### Patches

- Pin external deps to ensure explicit updates to lage bundle (elcraig@microsoft.com)

## 0.8.8

Tue, 12 Dec 2023 04:22:41 GMT

### Patches

- Upgrade workspace-tools package to latest (stchur@microsoft.com)

## 0.8.7

Mon, 17 Jul 2023 15:14:04 GMT

### Patches

- Update lage core deps (email not defined)

## 0.8.6

Mon, 08 May 2023 22:27:16 GMT

### Patches

- fixed against tests (kchau@microsoft.com)

## 0.8.4

Tue, 25 Apr 2023 02:51:19 GMT

### Patches

- Update repository and homepage (elcraig@microsoft.com)

## 0.8.3

Fri, 14 Apr 2023 04:37:55 GMT

### Patches

- making lage boot faster (kchau@microsoft.com)

## 0.8.2

Thu, 06 Apr 2023 22:27:50 GMT

### Patches

- bumps workspace-tools and use async packageinfos (kchau@microsoft.com)

## 0.8.1

Tue, 14 Mar 2023 00:28:38 GMT

### Patches

- adding support to directly run global task without deps (kchau@microsoft.com)

## 0.8.0

Fri, 10 Mar 2023 01:25:03 GMT

### Minor changes

- adding the ability to have a NoOp Task (kchau@microsoft.com)

## 0.7.0

Wed, 08 Mar 2023 00:05:27 GMT

### Minor changes

- allows global script cache (kchau@microsoft.com)

## 0.6.2

Wed, 15 Feb 2023 16:47:12 GMT

### Patches

- bumping workspace-tools to latest to support yarn 3 (kchau@microsoft.com)

## 0.6.1

Fri, 11 Nov 2022 07:29:47 GMT

### Patches

- adding more exports to let consumers create targets and to use the simpler targetgraph builder (kchau@microsoft.com)

## 0.6.0

Thu, 10 Nov 2022 20:20:45 GMT

### Minor changes

- refactoring TargetGraphBuilder to be able to be used as a non-workspace graph builder (kchau@microsoft.com)

### Patches

- marking getPackageAndTask as internal - it was an unintentional export. (kchau@microsoft.com)

## 0.5.3

Tue, 01 Nov 2022 22:25:59 GMT

### Patches

- adds import extensions of .js to prepare of esmodule switchover (kchau@microsoft.com)

## 0.5.2

Tue, 01 Nov 2022 20:43:17 GMT

### Patches

- cleaning up the tsconfig files (kchau@microsoft.com)

## 0.5.1

Sat, 29 Oct 2022 18:42:49 GMT

### Patches

- bump workspace-tools (ken@gizzar.com)

## 0.5.0

Wed, 26 Oct 2022 22:01:13 GMT

### Minor changes

- adds support for weighted targets (kchau@microsoft.com)

## 0.4.5

Wed, 26 Oct 2022 00:02:06 GMT

### Patches

- Removing sharded target support: moving in favor of "weighted target" instead (kchau@microsoft.com)

## 0.4.4

Sun, 23 Oct 2022 04:31:57 GMT

### Patches

- calculate shard count (ken@gizzar.com)

## 0.4.3

Thu, 20 Oct 2022 00:22:27 GMT

### Patches

- introducing maxWorkers, shards, and environmentGlob as target configs (shards is a future feature) (kchau@microsoft.com)

## 0.4.2

Mon, 03 Oct 2022 19:57:28 GMT

### Patches

- fixes prioritization so that it runs fast like p-graph did (kchau@microsoft.com)

## 0.4.1

Sat, 01 Oct 2022 16:21:41 GMT

### Patches

- fixes to get rid of console.logs (ken@gizzar.com)

## 0.4.0

Sat, 01 Oct 2022 15:29:50 GMT

### Minor changes

- detecting cycles (ken@gizzar.com)

## 0.3.5

Sat, 01 Oct 2022 06:41:42 GMT

### Patches

- adding some prioritize tests (ken@gizzar.com)

## 0.3.4

Thu, 29 Sep 2022 21:54:45 GMT

### Patches

- Update dependency workspace-tools to ^0.28.0 (email not defined)

## 0.3.3

Mon, 19 Sep 2022 05:03:56 GMT

### Patches

- fix unused var (ken@gizzar.com)

## 0.3.2

Sat, 17 Sep 2022 01:09:34 GMT

### Patches

- Update dependency workspace-tools to ^0.27.0 (email not defined)

## 0.3.1

Tue, 06 Sep 2022 20:10:16 GMT

### Patches

- disables cache for global targets (for now, since backfill doesn't support it) (kchau@microsoft.com)

## 0.3.0

Sun, 04 Sep 2022 23:00:20 GMT

### Minor changes

- Supports worker as a new target type (ken@gizzar.com)

## 0.2.2

Wed, 24 Aug 2022 22:26:03 GMT

### Patches

- Update dependency @types/node to v14.18.26 (renovate@whitesourcesoftware.com)

## 0.2.1

Wed, 24 Aug 2022 15:22:38 GMT

### Patches

- Update dependency workspace-tools to ^0.26.0 (renovate@whitesourcesoftware.com)

## 0.2.0

Tue, 09 Aug 2022 21:16:28 GMT

### Minor changes

- initial check in of target-graph - a refactored Pipeline and Target from lage v1 (kchau@microsoft.com)

### Patches

- refactored the start target id constant into a function (ken@gizzar.com)
- Update some dev dependencies (ken@gizzar.com)
- fixed formatting (ken@gizzar.com)
