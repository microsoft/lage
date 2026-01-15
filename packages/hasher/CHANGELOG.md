# Change Log - @lage-run/hasher

<!-- This log was last generated on Thu, 15 Jan 2026 23:24:00 GMT and should not be manually modified. -->

<!-- Start content -->

## 1.9.1

Thu, 15 Jan 2026 23:24:00 GMT

### Patches

- Update dependency workspace-tools to v0.40.0 (renovate@whitesourcesoftware.com)
- Add lint rule for no-floating-promises and fix several places (nemanjatesic@microsoft.com)

## 1.9.0

Mon, 01 Sep 2025 08:10:36 GMT

### Minor changes

- Add merge logic for targetConfig (dannyvv@microsoft.com)

## 1.8.3

Fri, 01 Aug 2025 08:10:15 GMT

### Patches

- Update dependency workspace-tools to v0.38.4 (renovate@whitesourcesoftware.com)

## 1.8.2

Thu, 17 Apr 2025 08:10:01 GMT

### Patches

- Update dependency workspace-tools to v0.38.3 (email not defined)

## 1.8.0

Sat, 29 Mar 2025 02:16:38 GMT

### Minor changes

- cheat on optimization by leverage the fact that 'info' command is called before anything else ALWAYS in BXL (kchau@microsoft.com)

## 1.6.9

Fri, 17 Jan 2025 21:57:32 GMT

### Patches

- Make package tree handle nested packages (kchau@microsoft.com)

## 1.6.8

Wed, 15 Jan 2025 16:56:22 GMT

### Patches

- Bump @lage-run/target-graph to v0.11.1

## 1.6.7

Mon, 02 Dec 2024 17:23:22 GMT

### Patches

- Bump @lage-run/target-graph to v0.11.0

## 1.6.6

Wed, 20 Nov 2024 08:12:37 GMT

### Patches

- Update dependency workspace-tools to v0.38.1 (email not defined)
- Bump @lage-run/target-graph to v0.10.1

## 1.6.5

Mon, 18 Nov 2024 23:22:30 GMT

### Patches

- Fix git command for getting untracked files in PackageTree.ts (slivanov@microsoft.com)

## 1.6.4

Fri, 08 Nov 2024 19:45:09 GMT

### Patches

- Bump @lage-run/target-graph to v0.10.0

## 1.6.3

Tue, 22 Oct 2024 15:19:29 GMT

### Patches

- Update dependency workspace-tools to v0.37.0 (email not defined)
- Bump @lage-run/target-graph to v0.9.3

## 1.6.2

Mon, 21 Oct 2024 22:18:54 GMT

### Patches

- Bump @lage-run/target-graph to v0.9.2

## 1.6.1

Thu, 17 Oct 2024 20:33:04 GMT

### Patches

- Bump @lage-run/target-graph to v0.9.1

## 1.6.0

Wed, 02 Oct 2024 20:26:19 GMT

### Minor changes

- exposes getInputFiles, packageTrees (kchau@microsoft.com)
- Bump @lage-run/globby to v14.2.0
- Bump @lage-run/target-graph to v0.9.0

## 1.5.0

Fri, 27 Sep 2024 20:03:49 GMT

### Minor changes

- exposes getInputFiles, packageTrees (kchau@microsoft.com)
- Bump @lage-run/globby to v14.1.0

## 1.4.0

Wed, 25 Sep 2024 20:28:10 GMT

### Minor changes

- writes out the "inputs" as hashes files inside node_modules\.cache\lage\hashes\** (kchau@microsoft.com)

## 1.3.4

Fri, 13 Sep 2024 18:05:04 GMT

### Patches

- Bump @lage-run/target-graph to v0.8.10

## 1.3.3

Wed, 11 Sep 2024 20:52:15 GMT

### Patches

- Update dependency micromatch to v4.0.8 [SECURITY] (renovate@whitesourcesoftware.com)
- Update dependency fast-glob to v3.3.2 (renovate@whitesourcesoftware.com)

## 1.3.2

Wed, 11 Sep 2024 20:30:48 GMT

### Patches

- yarn 4 (kchau@microsoft.com)
- Bump @lage-run/logger to v1.3.1

## 1.3.1

Wed, 04 Sep 2024 23:25:05 GMT

### Patches

- Use file hashes instead of just the file names for env glob for targets\ (kchau@microsoft.com)

## 1.3.0

Fri, 30 Aug 2024 18:40:09 GMT

### Minor changes

- adding the ability to calculate target env globs (kchau@microsoft.com)

## 1.2.1

Tue, 25 Jun 2024 22:03:40 GMT

### Patches

- reverting all the hasher changes (kchau@microsoft.com_msteamsmdb)

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
