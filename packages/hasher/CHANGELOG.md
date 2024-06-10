# Change Log - @lage-run/hasher

This log was last generated on Mon, 10 Jun 2024 23:50:39 GMT and should not be manually modified.

<!-- Start content -->

## 1.1.2

Mon, 10 Jun 2024 23:50:39 GMT

### Patches

- matching correct glob and exclude patterns (kchau@microsoft.com_msteamsmdb)

## 1.1.1

Sun, 05 May 2024 22:55:45 GMT

### Patches

- fixing hashing issues related to rust panic (kchau@microsoft.com)

## 1.1.0

Fri, 15 Mar 2024 04:35:11 GMT

### Minor changes

- perf optimizations (kchau@microsoft.com)

## 1.0.7

Thu, 21 Dec 2023 09:49:09 GMT

### Patches

- Pin external deps to ensure explicit updates to lage bundle (elcraig@microsoft.com)
- Bump @lage-run/target-graph to v0.8.9

## 1.0.6

Tue, 12 Dec 2023 04:22:41 GMT

### Patches

- Upgrade workspace-tools package to latest (stchur@microsoft.com)
- Bump @lage-run/target-graph to v0.8.8

## 1.0.5

Tue, 05 Sep 2023 22:23:23 GMT

### Patches

- Unpin workspace-tools, fast-glob, and execa dependencies (elcraig@microsoft.com)

## 1.0.4

Mon, 17 Jul 2023 15:14:04 GMT

### Patches

- Update lage core deps (email not defined)
- Bump @lage-run/target-graph to v0.8.7

## 1.0.3

Tue, 11 Jul 2023 14:51:52 GMT

### Patches

- Log file level input file hashes to silly logs (brunoru@microsoft.com)

## 1.0.2

Wed, 21 Jun 2023 19:06:25 GMT

### Patches

- Added logging in TargetHasher, now logs hash of glob-hashed files for global input hash comparison (brunoru@microsoft.com)

## 1.0.1

Fri, 26 May 2023 01:09:04 GMT

### Patches

- makes sure the presence of a file does not crash lage on the file hashing (kchau@microsoft.com)

## 1.0.0

Mon, 08 May 2023 22:27:16 GMT

### Major changes

- Added FileHasher, PackageTree, and its own TargetHasher (kchau@microsoft.com)
- Bump @lage-run/target-graph to v0.8.6

## 0.2.2

Wed, 29 Mar 2023 20:02:40 GMT

### Patches

- moving back to fast-glob for globbing, as it was more accurate (kchau@microsoft.com)

## 0.2.1

Wed, 08 Mar 2023 17:35:28 GMT

### Patches

- deleted unused sortObjects (kchau@microsoft.com)

## 0.2.0

Wed, 08 Mar 2023 00:05:27 GMT

### Minor changes

- allows global script cache (kchau@microsoft.com)

## 0.1.3

Wed, 15 Feb 2023 16:51:15 GMT

### Patches

- Update dependency workspace-tools to v0.30.0 (renovate@whitesourcesoftware.com)

## 0.1.2

Fri, 18 Nov 2022 19:52:38 GMT

### Patches

- Update dependency workspace-tools to v0.29.1 (email not defined)

## 0.1.1

Wed, 02 Nov 2022 06:27:27 GMT

### Patches

- adds a hasher package that has very few deps (ken@gizzar.com)
