# Change Log - @lage-run/target-graph

This log was last generated on Fri, 11 Nov 2022 07:29:47 GMT and should not be manually modified.

<!-- Start content -->

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
