# Change Log - @lage-run/hasher

This log was last generated on Tue, 11 Jul 2023 14:51:52 GMT and should not be manually modified.

<!-- Start content -->

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
