# Change Log - @lage-run/cli

<!-- This log was last generated on Thu, 23 Jan 2025 17:38:05 GMT and should not be manually modified. -->

<!-- Start content -->

## 0.24.13

Thu, 23 Jan 2025 17:38:05 GMT

### Patches

- Bump @lage-run/scheduler to v1.5.0
- Bump @lage-run/worker-threads-pool to v0.9.0

## 0.24.12

Fri, 17 Jan 2025 21:57:32 GMT

### Patches

- Bump @lage-run/hasher to v1.6.9
- Bump @lage-run/scheduler to v1.4.5

## 0.24.11

Wed, 15 Jan 2025 16:56:22 GMT

### Patches

- Fix bug where priorities were not being correctly set on tasks (1581488+christiango@users.noreply.github.com)
- Bump @lage-run/cache to v1.3.11
- Bump @lage-run/config to v0.4.12
- Bump @lage-run/hasher to v1.6.8
- Bump @lage-run/reporters to v1.2.19
- Bump @lage-run/runners to v1.2.1
- Bump @lage-run/scheduler to v1.4.4
- Bump @lage-run/scheduler-types to v0.3.23
- Bump @lage-run/target-graph to v0.11.1

## 0.24.10

Fri, 20 Dec 2024 19:42:00 GMT

### Patches

- adds the directory probing as well (kchau@microsoft.com)

## 0.24.9

Thu, 19 Dec 2024 15:53:46 GMT

### Patches

- Bump @lage-run/scheduler to v1.4.3

## 0.24.8

Tue, 10 Dec 2024 23:38:54 GMT

### Patches

- makes sure the failing case also reports i/o of files (kchau@microsoft.com)

## 0.24.7

Mon, 09 Dec 2024 06:21:52 GMT

### Patches

- fixing the outputs so it includes files I/O (kchau@microsoft.com)

## 0.24.6

Sun, 08 Dec 2024 00:07:28 GMT

### Patches

- adds the ability to do workerIdleMemoryLimit (kchau@microsoft.com)
- Bump @lage-run/scheduler to v1.4.2
- Bump @lage-run/worker-threads-pool to v0.8.6

## 0.24.5

Wed, 04 Dec 2024 23:50:15 GMT

### Patches

- Fixes the server worker model to use aggregated pool (kchau@microsoft.com)
- Bump @lage-run/scheduler to v1.4.1
- Bump @lage-run/worker-threads-pool to v0.8.5

## 0.24.4

Mon, 02 Dec 2024 17:23:22 GMT

### Patches

- adds the ability to create stagedTargets (kchau@microsoft.com)
- Bump @lage-run/cache to v1.3.10
- Bump @lage-run/config to v0.4.11
- Bump @lage-run/hasher to v1.6.7
- Bump @lage-run/reporters to v1.2.18
- Bump @lage-run/runners to v1.2.0
- Bump @lage-run/scheduler to v1.4.0
- Bump @lage-run/scheduler-types to v0.3.22
- Bump @lage-run/target-graph to v0.11.0

## 0.24.3

Wed, 20 Nov 2024 08:12:37 GMT

### Patches

- Update dependency workspace-tools to v0.38.1 (email not defined)
- Bump @lage-run/cache to v1.3.9
- Bump @lage-run/config to v0.4.10
- Bump @lage-run/hasher to v1.6.6
- Bump @lage-run/reporters to v1.2.17
- Bump @lage-run/runners to v1.1.2
- Bump @lage-run/scheduler to v1.3.12
- Bump @lage-run/scheduler-types to v0.3.21
- Bump @lage-run/target-graph to v0.10.1

## 0.24.2

Wed, 20 Nov 2024 02:43:43 GMT

### Patches

- adding exit code support for executeInProcess (kchau@microsoft.com)
- Bump @lage-run/config to v0.4.9
- Bump @lage-run/runners to v1.1.1
- Bump @lage-run/scheduler to v1.3.11

## 0.24.1

Mon, 18 Nov 2024 23:22:30 GMT

### Patches

- Bump @lage-run/hasher to v1.6.5
- Bump @lage-run/scheduler to v1.3.10

## 0.24.0

Fri, 08 Nov 2024 19:45:09 GMT

### Minor changes

- add "shouldRun()" config to the target config (kchau@microsoft.com)
- Bump @lage-run/cache to v1.3.8
- Bump @lage-run/config to v0.4.8
- Bump @lage-run/hasher to v1.6.4
- Bump @lage-run/reporters to v1.2.16
- Bump @lage-run/runners to v1.1.0
- Bump @lage-run/scheduler to v1.3.9
- Bump @lage-run/scheduler-types to v0.3.20
- Bump @lage-run/target-graph to v0.10.0

## 0.23.11

Fri, 08 Nov 2024 19:27:44 GMT

### Patches

- Bump @lage-run/scheduler to v1.3.8

## 0.23.10

Fri, 01 Nov 2024 08:07:38 GMT

### Patches

- skip using npm client if running a node script (kchau@microsoft.com)
- Bump @lage-run/config to v0.4.7
- Bump @lage-run/runners to v1.0.7
- Bump @lage-run/scheduler to v1.3.7

## 0.23.9

Tue, 22 Oct 2024 15:19:29 GMT

### Patches

- Update dependency workspace-tools to v0.37.0 (email not defined)
- Bump @lage-run/cache to v1.3.7
- Bump @lage-run/config to v0.4.6
- Bump @lage-run/hasher to v1.6.3
- Bump @lage-run/reporters to v1.2.15
- Bump @lage-run/runners to v1.0.6
- Bump @lage-run/scheduler to v1.3.6
- Bump @lage-run/scheduler-types to v0.3.19
- Bump @lage-run/target-graph to v0.9.3

## 0.23.8

Mon, 21 Oct 2024 22:18:54 GMT

### Patches

- Bump @lage-run/cache to v1.3.6
- Bump @lage-run/config to v0.4.5
- Bump @lage-run/hasher to v1.6.2
- Bump @lage-run/reporters to v1.2.14
- Bump @lage-run/runners to v1.0.5
- Bump @lage-run/scheduler to v1.3.5
- Bump @lage-run/scheduler-types to v0.3.18
- Bump @lage-run/target-graph to v0.9.2

## 0.23.7

Thu, 17 Oct 2024 20:33:04 GMT

### Patches

- Bump @lage-run/cache to v1.3.5
- Bump @lage-run/config to v0.4.4
- Bump @lage-run/hasher to v1.6.1
- Bump @lage-run/reporters to v1.2.13
- Bump @lage-run/runners to v1.0.4
- Bump @lage-run/scheduler to v1.3.4
- Bump @lage-run/scheduler-types to v0.3.17
- Bump @lage-run/target-graph to v0.9.1

## 0.23.6

Fri, 11 Oct 2024 22:09:18 GMT

### Patches

- moved the picker creation to be just once to be reused in a singletargetworker (kchau@microsoft.com)
- Bump @lage-run/reporters to v1.2.12

## 0.23.5

Thu, 10 Oct 2024 20:14:59 GMT

### Patches

- shutoff at 3 minutes (kchau@microsoft.com)

## 0.23.4

Wed, 09 Oct 2024 17:20:33 GMT

### Patches

- fixing up the lage integrate with buildxl to utilize lage-server (kchau@microsoft.com)
- Bump @lage-run/scheduler to v1.3.3
- Bump @lage-run/worker-threads-pool to v0.8.4

## 0.23.3

Tue, 08 Oct 2024 20:03:36 GMT

### Patches

- uses the shell scripts to have a different executable name (kchau@microsoft.com)

## 0.23.2

Mon, 07 Oct 2024 19:33:13 GMT

### Patches

- Fixing the action command generation to handle the case of launching as server without --server (kchau@microsoft.com)

## 0.23.1

Fri, 04 Oct 2024 23:41:44 GMT

### Patches

- Modified info command to accommodate a "LAGE_WORKER_SERVER" flag (also, --server) (kchau@microsoft.com)
- Bump @lage-run/rpc to v1.2.3

## 0.23.0

Wed, 02 Oct 2024 20:26:19 GMT

### Minor changes

- Simulate file access for lage server (kchau@microsoft.com)
- Bump @lage-run/cache to v1.3.4
- Bump @lage-run/config to v0.4.3
- Bump @lage-run/globby to v14.2.0
- Bump @lage-run/hasher to v1.6.0
- Bump @lage-run/reporters to v1.2.11
- Bump @lage-run/rpc to v1.2.2
- Bump @lage-run/runners to v1.0.3
- Bump @lage-run/scheduler to v1.3.2
- Bump @lage-run/scheduler-types to v0.3.16
- Bump @lage-run/target-graph to v0.9.0
- Bump @lage-run/worker-threads-pool to v0.8.3

## 0.22.0

Fri, 27 Sep 2024 20:03:49 GMT

### Minor changes

- Simulate file access for lage server (kchau@microsoft.com)
- Bump @lage-run/globby to v14.1.0
- Bump @lage-run/hasher to v1.5.0
- Bump @lage-run/rpc to v1.2.1
- Bump @lage-run/scheduler to v1.3.1
- Bump @lage-run/worker-threads-pool to v0.8.2

## 0.21.0

Wed, 25 Sep 2024 20:28:10 GMT

### Minor changes

- Bump @lage-run/hasher to v1.4.0
- Bump @lage-run/scheduler to v1.3.0

## 0.20.0

Fri, 13 Sep 2024 18:05:04 GMT

### Minor changes

- adds a lage-server binary that listens and executes and auto shutsdown (kchau@microsoft.com)
- Bump @lage-run/cache to v1.3.3
- Bump @lage-run/config to v0.4.2
- Bump @lage-run/hasher to v1.3.4
- Bump @lage-run/reporters to v1.2.10
- Bump @lage-run/rpc to v1.2.0
- Bump @lage-run/runners to v1.0.2
- Bump @lage-run/scheduler to v1.2.14
- Bump @lage-run/scheduler-types to v0.3.15
- Bump @lage-run/target-graph to v0.8.10

## 0.19.3

Wed, 11 Sep 2024 20:52:15 GMT

### Patches

- Update dependency fast-glob to v3.3.2 (renovate@whitesourcesoftware.com)
- Bump @lage-run/hasher to v1.3.3
- Bump @lage-run/scheduler to v1.2.13

## 0.19.2

Wed, 11 Sep 2024 20:30:48 GMT

### Patches

- Bump @lage-run/cache to v1.3.2
- Bump @lage-run/config to v0.4.1
- Bump @lage-run/hasher to v1.3.2
- Bump @lage-run/logger to v1.3.1
- Bump @lage-run/reporters to v1.2.9
- Bump @lage-run/scheduler to v1.2.12
- Bump @lage-run/worker-threads-pool to v0.8.1

## 0.19.1

Sat, 07 Sep 2024 00:01:57 GMT

### Patches

- adding parallelism to server (kchau@microsoft.com)
- Bump @lage-run/config to v0.4.0
- Bump @lage-run/scheduler to v1.2.11

## 0.19.0

Fri, 06 Sep 2024 20:03:01 GMT

### Minor changes

- remote execution RPC server and client for Lage (kchau@microsoft.com)
- Bump @lage-run/rpc to v1.1.0

## 0.18.1

Wed, 04 Sep 2024 23:25:05 GMT

### Patches

- Bump @lage-run/hasher to v1.3.1
- Bump @lage-run/scheduler to v1.2.10

## 0.18.0

Fri, 30 Aug 2024 18:40:09 GMT

### Minor changes

- adds an exec command that skips building a target graph. (kchau@microsoft.com)
- Bump @lage-run/hasher to v1.3.0
- Bump @lage-run/scheduler to v1.2.9

## 0.17.8

Wed, 28 Aug 2024 21:12:45 GMT

### Patches

- moving runners to its own package, fixing up imports (kchau@microsoft.com)
- Bump @lage-run/config to v0.3.7
- Bump @lage-run/reporters to v1.2.8
- Bump @lage-run/runners to v1.0.1
- Bump @lage-run/scheduler to v1.2.8
- Bump @lage-run/scheduler-types to v0.3.14

## 0.17.7

Tue, 25 Jun 2024 22:03:40 GMT

### Patches

- Bump @lage-run/hasher to v1.2.1
- Bump @lage-run/scheduler to v1.2.7

## 0.17.6

Tue, 25 Jun 2024 18:25:19 GMT

### Patches

- Bump @lage-run/cache to v1.3.1
- Bump @lage-run/scheduler to v1.2.6

## 0.17.5

Tue, 25 Jun 2024 18:10:57 GMT

### Patches

- Bump @lage-run/hasher to v1.2.0
- Bump @lage-run/scheduler to v1.2.5

## 0.17.4

Tue, 18 Jun 2024 00:31:29 GMT

### Patches

- Bump @lage-run/cache to v1.3.0
- Bump @lage-run/scheduler to v1.2.4

## 0.17.3

Mon, 10 Jun 2024 23:50:39 GMT

### Patches

- Bump @lage-run/cache to v1.2.0
- Bump @lage-run/hasher to v1.1.2
- Bump @lage-run/scheduler to v1.2.3

## 0.17.2

Thu, 23 May 2024 18:15:05 GMT

### Patches

- Bump @lage-run/cache to v1.1.7
- Bump @lage-run/config to v0.3.6
- Bump @lage-run/scheduler to v1.2.2

## 0.17.1

Sun, 05 May 2024 22:55:45 GMT

### Patches

- Bump @lage-run/cache to v1.1.6
- Bump @lage-run/hasher to v1.1.1
- Bump @lage-run/scheduler to v1.2.1

## 0.17.0

Tue, 23 Apr 2024 22:21:27 GMT

### Minor changes

- Set shell: true when spawning npm commands, due to Node security fix. Also remove custom npm client resolution logic, which should be handled based on the PATH in the shell. (elcraig@microsoft.com)
- Bump @lage-run/scheduler to v1.2.0

## 0.16.7

Fri, 15 Mar 2024 04:35:11 GMT

### Patches

- perf optimizations (kchau@microsoft.com)
- Bump @lage-run/hasher to v1.1.0
- Bump @lage-run/scheduler to v1.1.13

## 0.16.6

Mon, 26 Feb 2024 16:18:50 GMT

### Patches

- Fix undefined dependencies in info output (sverre.johansen@gmail.com)

## 0.16.5

Thu, 21 Dec 2023 09:49:09 GMT

### Patches

- Pin external deps to ensure explicit updates to lage bundle (elcraig@microsoft.com)
- Bump @lage-run/cache to v1.1.5
- Bump @lage-run/config to v0.3.5
- Bump @lage-run/hasher to v1.0.7
- Bump @lage-run/reporters to v1.2.7
- Bump @lage-run/scheduler to v1.1.12
- Bump @lage-run/scheduler-types to v0.3.13
- Bump @lage-run/target-graph to v0.8.9

## 0.16.4

Thu, 21 Dec 2023 08:37:41 GMT

### Patches

- Bump @lage-run/config to v0.3.4
- Bump @lage-run/scheduler to v1.1.11

## 0.16.3

Tue, 12 Dec 2023 04:22:41 GMT

### Patches

- Upgrade workspace-tools package to latest (stchur@microsoft.com)
- Bump @lage-run/cache to v1.1.4
- Bump @lage-run/config to v0.3.3
- Bump @lage-run/hasher to v1.0.6
- Bump @lage-run/reporters to v1.2.6
- Bump @lage-run/scheduler to v1.1.10
- Bump @lage-run/scheduler-types to v0.3.12
- Bump @lage-run/target-graph to v0.8.8

## 0.16.2

Tue, 05 Sep 2023 22:23:23 GMT

### Patches

- Unpin execa dependency (elcraig@microsoft.com)
- Bump @lage-run/hasher to v1.0.5
- Bump @lage-run/scheduler to v1.1.9

## 0.16.1

Tue, 05 Sep 2023 22:19:29 GMT

### Patches

- Bump @lage-run/cache to v1.1.3
- Bump @lage-run/scheduler to v1.1.8

## 0.16.0

Wed, 09 Aug 2023 18:41:19 GMT

### Minor changes

- Implemented info command in lage v2 (unpervertedkid@gmail.com)

## 0.15.13

Mon, 17 Jul 2023 15:14:04 GMT

### Patches

- Update lage core deps (email not defined)
- Bump @lage-run/cache to v1.1.2
- Bump @lage-run/config to v0.3.2
- Bump @lage-run/hasher to v1.0.4
- Bump @lage-run/reporters to v1.2.5
- Bump @lage-run/scheduler to v1.1.7
- Bump @lage-run/scheduler-types to v0.3.11
- Bump @lage-run/target-graph to v0.8.7

## 0.15.12

Tue, 11 Jul 2023 14:51:52 GMT

### Patches

- Bump @lage-run/hasher to v1.0.3
- Bump @lage-run/scheduler to v1.1.6

## 0.15.11

Wed, 21 Jun 2023 19:06:25 GMT

### Patches

- Passing logger object to TargetHasher for hasher init logging (brunoru@microsoft.com)
- Bump @lage-run/hasher to v1.0.2
- Bump @lage-run/scheduler to v1.1.5

## 0.15.10

Thu, 15 Jun 2023 17:04:58 GMT

### Patches

- Bump @lage-run/config to v0.3.1
- Bump @lage-run/reporters to v1.2.4
- Bump @lage-run/scheduler to v1.1.4
- Bump @lage-run/scheduler-types to v0.3.10

## 0.15.9

Tue, 30 May 2023 18:19:34 GMT

### Patches

- Bump @lage-run/scheduler to v1.1.3

## 0.15.8

Fri, 26 May 2023 20:44:05 GMT

### Patches

- Bump @lage-run/scheduler to v1.1.2

## 0.15.7

Fri, 26 May 2023 01:09:04 GMT

### Patches

- Bump @lage-run/hasher to v1.0.1
- Bump @lage-run/scheduler to v1.1.1

## 0.15.6

Fri, 26 May 2023 00:17:46 GMT

### Patches

- Bump @lage-run/scheduler to v1.1.0

## 0.15.5

Thu, 25 May 2023 15:46:02 GMT

### Patches

- Do not read config in targetWorker, instead pass CacheOptions as part of workerdata (altinokd@microsoft.com)
- Bump @lage-run/config to v0.3.0
- Bump @lage-run/scheduler to v1.0.2

## 0.15.4

Fri, 19 May 2023 22:10:20 GMT

### Patches

- Bump @lage-run/scheduler to v1.0.1

## 0.15.3

Fri, 12 May 2023 06:12:34 GMT

### Patches

- Bump @lage-run/reporters to v1.2.3

## 0.15.2

Mon, 08 May 2023 22:27:16 GMT

### Patches

- fixed to utilize the correct package for the hasher (kchau@microsoft.com)
- Bump @lage-run/cache to v1.1.1
- Bump @lage-run/config to v0.2.1
- Bump @lage-run/hasher to v1.0.0
- Bump @lage-run/reporters to v1.2.2
- Bump @lage-run/scheduler to v1.0.0
- Bump @lage-run/scheduler-types to v0.3.9
- Bump @lage-run/target-graph to v0.8.6

## 0.15.1

Mon, 08 May 2023 16:33:24 GMT

### Patches

- Bump @lage-run/reporters to v1.2.1

## 0.15.0

Wed, 26 Apr 2023 04:56:20 GMT

### Minor changes

- Add back the init command (elcraig@microsoft.com)
- Bump @lage-run/config to v0.2.0
- Bump @lage-run/scheduler to v0.11.4

## 0.14.0

Tue, 25 Apr 2023 02:51:19 GMT

### Minor changes

- Add support for --log-file (to be used in concert with --reporter vfl (stchur@microsoft.com)
- Bump @lage-run/config to v0.1.4
- Bump @lage-run/logger to v1.3.0
- Bump @lage-run/scheduler to v0.11.3
- Bump @lage-run/scheduler-types to v0.3.8
- Bump @lage-run/target-graph to v0.8.4
- Bump @lage-run/cache to v0.5.4
- Bump @lage-run/reporters to v1.2.0

### Patches

- Update repository and homepage (elcraig@microsoft.com)
- [object Object] (stchur@microsoft.com)

## 0.13.2

Fri, 14 Apr 2023 04:37:54 GMT

### Patches

- making lage boot faster (kchau@microsoft.com)
- Bump @lage-run/config to v0.1.3
- Bump @lage-run/scheduler to v0.11.2
- Bump @lage-run/scheduler-types to v0.3.7
- Bump @lage-run/target-graph to v0.8.3
- Bump @lage-run/cache to v0.5.3
- Bump @lage-run/reporters to v1.1.2

## 0.13.1

Thu, 06 Apr 2023 22:27:50 GMT

### Patches

- bumps workspace-tools and use async packageinfos (kchau@microsoft.com)
- Bump @lage-run/config to v0.1.2
- Bump @lage-run/scheduler to v0.11.1
- Bump @lage-run/scheduler-types to v0.3.6
- Bump @lage-run/target-graph to v0.8.2
- Bump @lage-run/cache to v0.5.2
- Bump @lage-run/reporters to v1.1.1

## 0.13.0

Sat, 01 Apr 2023 00:28:31 GMT

### Minor changes

- replace ink with @ms-cloudpack/task-reporter (kchau@microsoft.com)
- Bump @lage-run/reporters to v1.1.0

## 0.12.0

Thu, 30 Mar 2023 23:46:52 GMT

### Minor changes

- moved caching to happen inside workers (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.11.0

## 0.11.4

Wed, 29 Mar 2023 22:41:49 GMT

### Patches

- moving config to its own package (kchau@microsoft.com)
- Bump @lage-run/config to v0.1.1
- Bump @lage-run/scheduler to v0.10.5
- Bump @lage-run/scheduler-types to v0.3.5
- Bump @lage-run/reporters to v1.0.7

## 0.11.3

Wed, 29 Mar 2023 20:02:40 GMT

### Patches

- Bump @lage-run/scheduler to v0.10.4
- Bump @lage-run/cache to v0.5.1

## 0.11.2

Mon, 27 Mar 2023 18:00:15 GMT

### Patches

- Bump @lage-run/scheduler to v0.10.3
- Bump @lage-run/cache to v0.5.0

## 0.11.1

Thu, 23 Mar 2023 19:32:03 GMT

### Patches

- Bump @lage-run/scheduler to v0.10.2

## 0.11.0

Wed, 22 Mar 2023 17:26:54 GMT

### Minor changes

- Export more types used by the config (elcraig@microsoft.com)

## 0.10.1

Tue, 14 Mar 2023 00:28:38 GMT

### Patches

- Bump @lage-run/scheduler to v0.10.1
- Bump @lage-run/scheduler-types to v0.3.4
- Bump @lage-run/target-graph to v0.8.1
- Bump @lage-run/cache to v0.4.3
- Bump @lage-run/reporters to v1.0.6

## 0.10.0

Fri, 10 Mar 2023 01:25:03 GMT

### Minor changes

- adding the ability to have a NoOp Task (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.10.0
- Bump @lage-run/scheduler-types to v0.3.3
- Bump @lage-run/target-graph to v0.8.0
- Bump @lage-run/cache to v0.4.2
- Bump @lage-run/reporters to v1.0.5

## 0.9.2

Wed, 08 Mar 2023 17:35:28 GMT

### Patches

- Bump @lage-run/scheduler to v0.9.2
- Bump @lage-run/cache to v0.4.1

## 0.9.1

Wed, 08 Mar 2023 00:05:27 GMT

### Patches

- Bump @lage-run/scheduler to v0.9.1
- Bump @lage-run/scheduler-types to v0.3.2
- Bump @lage-run/target-graph to v0.7.0
- Bump @lage-run/cache to v0.4.0
- Bump @lage-run/reporters to v1.0.4

## 0.9.0

Tue, 21 Feb 2023 21:30:37 GMT

### Minor changes

- cache directory to be centralized (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.9.0
- Bump @lage-run/cache to v0.3.0

## 0.8.6

Sat, 18 Feb 2023 00:43:33 GMT

### Patches

- Bump @lage-run/reporters to v1.0.3

## 0.8.5

Sat, 18 Feb 2023 00:40:18 GMT

### Patches

- Bump @lage-run/reporters to v1.0.2

## 0.8.4

Wed, 15 Feb 2023 16:51:15 GMT

### Patches

- Bump @lage-run/scheduler to v0.8.5
- Bump @lage-run/cache to v0.2.5

## 0.8.3

Wed, 15 Feb 2023 16:47:12 GMT

### Patches

- bumping workspace-tools to latest to support yarn 3 (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.8.4
- Bump @lage-run/scheduler-types to v0.3.1
- Bump @lage-run/target-graph to v0.6.2
- Bump @lage-run/cache to v0.2.4
- Bump @lage-run/reporters to v1.0.1

## 0.8.2

Tue, 07 Feb 2023 23:52:48 GMT

### Patches

- migrating to V2 (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.8.3

## 0.8.1

Mon, 06 Feb 2023 23:42:51 GMT

### Patches

- fixing up some logger options to set up proper conflicts (kchau@microsoft.com)

## 0.8.0

Fri, 03 Feb 2023 00:20:10 GMT

### Minor changes

- adding an affected command (kchau@microsoft.com)

## 0.7.3

Tue, 31 Jan 2023 23:54:49 GMT

### Patches

- Bump @lage-run/scheduler to v0.8.2

## 0.7.2

Tue, 31 Jan 2023 18:24:39 GMT

### Patches

- switch back to old log reporter when "verbose" or "grouped" are used (kchau@microsoft.com)
- Bump @lage-run/reporters to v1.0.0

## 0.7.1

Mon, 30 Jan 2023 17:26:59 GMT

### Patches

- Bump @lage-run/reporters to v0.3.2

## 0.7.0

Fri, 27 Jan 2023 20:50:27 GMT

### Minor changes

- adding an info flag for run (kchau@microsoft.com)

## 0.6.4

Fri, 27 Jan 2023 20:02:06 GMT

### Patches

- make sure to take the task args into account for caching (kchau@microsoft.com)

## 0.6.3

Fri, 27 Jan 2023 00:28:15 GMT

### Patches

- Bump @lage-run/scheduler to v0.8.1
- Bump @lage-run/reporters to v0.3.1

## 0.6.2

Wed, 18 Jan 2023 23:27:05 GMT

### Patches

- get rid of any imports not from node built-ins for these runners (kchau@microsoft.com)

## 0.6.1

Wed, 18 Jan 2023 19:11:10 GMT

### Patches

- making sure the cache tasks are returning promises (kchau@microsoft.com)

## 0.6.0

Wed, 18 Jan 2023 18:18:35 GMT

### Minor changes

- Using lage for prune and clear on cache and get reporter in shape for ADO (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.8.0
- Bump @lage-run/scheduler-types to v0.3.0
- Bump @lage-run/reporters to v0.3.0

## 0.5.7

Thu, 05 Jan 2023 00:40:50 GMT

### Patches

- Bump @lage-run/scheduler to v0.7.3
- Bump @lage-run/reporters to v0.2.44

## 0.5.6

Thu, 08 Dec 2022 00:49:28 GMT

### Patches

- sets the default to progress (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.7.2
- Bump @lage-run/reporters to v0.2.43

## 0.5.5

Tue, 06 Dec 2022 23:28:12 GMT

### Patches

- Bump @lage-run/reporters to v0.2.42

## 0.5.4

Tue, 06 Dec 2022 00:48:02 GMT

### Patches

- creating the beginnings of a progress reporter - it's in beta (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.7.1
- Bump @lage-run/scheduler-types to v0.2.10
- Bump @lage-run/reporters to v0.2.41

## 0.5.3

Mon, 05 Dec 2022 18:02:35 GMT

### Patches

- Bump @lage-run/scheduler to v0.7.0

## 0.5.2

Mon, 21 Nov 2022 06:32:03 GMT

### Patches

- Fixing the watch mode to use the newer simple scheduler (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.6.0
- Bump @lage-run/scheduler-types to v0.2.9
- Bump @lage-run/reporters to v0.2.40

## 0.5.1

Fri, 18 Nov 2022 19:52:38 GMT

### Patches

- Bump @lage-run/scheduler to v0.5.15
- Bump @lage-run/cache to v0.2.3

## 0.5.0

Thu, 17 Nov 2022 19:29:51 GMT

### Minor changes

- support "to" flag (kchau@microsoft.com)

## 0.4.37

Wed, 16 Nov 2022 20:07:05 GMT

### Patches

- Bump @lage-run/scheduler to v0.5.14

## 0.4.36

Wed, 16 Nov 2022 17:12:24 GMT

### Patches

- Bump @lage-run/scheduler to v0.5.13

## 0.4.35

Fri, 11 Nov 2022 07:29:47 GMT

### Patches

- Bump @lage-run/scheduler to v0.5.12
- Bump @lage-run/scheduler-types to v0.2.8
- Bump @lage-run/target-graph to v0.6.1
- Bump @lage-run/cache to v0.2.2
- Bump @lage-run/reporters to v0.2.39

## 0.4.34

Thu, 10 Nov 2022 20:20:45 GMT

### Patches

- update api from targetgraphbuilder (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.5.11
- Bump @lage-run/scheduler-types to v0.2.7
- Bump @lage-run/target-graph to v0.6.0
- Bump @lage-run/cache to v0.2.1
- Bump @lage-run/reporters to v0.2.38

## 0.4.33

Fri, 04 Nov 2022 21:14:01 GMT

### Patches

- Bump @lage-run/scheduler to v0.5.10

## 0.4.32

Wed, 02 Nov 2022 20:45:00 GMT

### Patches

- switching from require() to import() where possible (ken@gizzar.com)
- Bump @lage-run/scheduler to v0.5.9

## 0.4.31

Wed, 02 Nov 2022 06:27:27 GMT

### Patches

- Bump @lage-run/scheduler to v0.5.8
- Bump @lage-run/cache to v0.2.0

## 0.4.30

Tue, 01 Nov 2022 22:48:33 GMT

### Patches

- Bump @lage-run/scheduler to v0.5.7
- Bump @lage-run/scheduler-types to v0.2.6
- Bump @lage-run/reporters to v0.2.37

## 0.4.29

Tue, 01 Nov 2022 22:25:59 GMT

### Patches

- adds import extensions of .js to prepare of esmodule switchover (kchau@microsoft.com)
- Bump @lage-run/find-npm-client to v0.1.4
- Bump @lage-run/logger to v1.2.2
- Bump @lage-run/scheduler to v0.5.6
- Bump @lage-run/scheduler-types to v0.2.5
- Bump @lage-run/target-graph to v0.5.3
- Bump @lage-run/cache to v0.1.28
- Bump @lage-run/reporters to v0.2.36

## 0.4.28

Tue, 01 Nov 2022 20:43:17 GMT

### Patches

- cleaning up the tsconfig files (kchau@microsoft.com)
- Bump @lage-run/find-npm-client to v0.1.3
- Bump @lage-run/logger to v1.2.1
- Bump @lage-run/scheduler to v0.5.5
- Bump @lage-run/scheduler-types to v0.2.4
- Bump @lage-run/target-graph to v0.5.2
- Bump @lage-run/cache to v0.1.27
- Bump @lage-run/reporters to v0.2.35

## 0.4.27

Mon, 31 Oct 2022 21:56:09 GMT

### Patches

- adds taskArgs param for worker scripts (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.5.4

## 0.4.26

Mon, 31 Oct 2022 21:27:52 GMT

### Patches

- adds depcheck and fixes (kchau@microsoft.com)
- Bump @lage-run/find-npm-client to v0.1.2
- Bump @lage-run/scheduler to v0.5.3
- Bump @lage-run/scheduler-types to v0.2.3
- Bump @lage-run/reporters to v0.2.34

## 0.4.25

Sat, 29 Oct 2022 18:42:49 GMT

### Patches

- bump workspace-tools (ken@gizzar.com)
- Bump @lage-run/scheduler to v0.5.2
- Bump @lage-run/target-graph to v0.5.1
- Bump @lage-run/cache to v0.1.26
- Bump @lage-run/reporters to v0.2.33

## 0.4.24

Sat, 29 Oct 2022 01:06:17 GMT

### Patches

- adds a memory limit param (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.5.1
- Bump @lage-run/reporters to v0.2.32

## 0.4.23

Wed, 26 Oct 2022 22:48:35 GMT

### Patches

- run modified packages and their deps first if running with since option and hitting repoWideChanges (email not defined)

## 0.4.22

Wed, 26 Oct 2022 22:01:13 GMT

### Patches

- Bump @lage-run/scheduler to v0.5.0
- Bump @lage-run/target-graph to v0.5.0
- Bump @lage-run/cache to v0.1.25
- Bump @lage-run/reporters to v0.2.31

## 0.4.21

Wed, 26 Oct 2022 00:02:06 GMT

### Patches

- Bump @lage-run/scheduler to v0.4.16
- Bump @lage-run/target-graph to v0.4.5
- Bump @lage-run/cache to v0.1.24
- Bump @lage-run/reporters to v0.2.30

## 0.4.20

Tue, 25 Oct 2022 00:06:49 GMT

### Patches

- Bump @lage-run/scheduler to v0.4.15
- Bump @lage-run/cache to v0.1.23
- Bump @lage-run/reporters to v0.2.29

## 0.4.19

Mon, 24 Oct 2022 21:40:05 GMT

### Patches

- Bump @lage-run/scheduler to v0.4.14
- Bump @lage-run/cache to v0.1.22
- Bump @lage-run/reporters to v0.2.28

## 0.4.18

Sun, 23 Oct 2022 04:31:57 GMT

### Patches

- Adds support for the CLI to configure the maxWorkersPerTask via --max-workers-per-task (ken@gizzar.com)
- Bump @lage-run/scheduler to v0.4.13
- Bump @lage-run/target-graph to v0.4.4
- Bump @lage-run/cache to v0.1.21
- Bump @lage-run/reporters to v0.2.27

## 0.4.17

Fri, 21 Oct 2022 23:04:34 GMT

### Patches

- fixing the max worker again - this time we need to account for general pool availability (ken@gizzar.com)

## 0.4.16

Fri, 21 Oct 2022 21:36:38 GMT

### Patches

- pipelines with maxWorker now create separate pools (ken@gizzar.com)
- Bump @lage-run/scheduler to v0.4.12
- Bump @lage-run/reporters to v0.2.26

## 0.4.15

Fri, 21 Oct 2022 19:33:09 GMT

### Patches

- Bump @lage-run/scheduler to v0.4.11
- Bump @lage-run/reporters to v0.2.25

## 0.4.14

Thu, 20 Oct 2022 00:22:27 GMT

### Patches

- promotes maxWorker to be a "top level" target config (options are for target runners) (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.4.10
- Bump @lage-run/target-graph to v0.4.3
- Bump @lage-run/cache to v0.1.20
- Bump @lage-run/reporters to v0.2.24

## 0.4.13

Wed, 12 Oct 2022 21:07:14 GMT

### Patches

- Bump @lage-run/scheduler to v0.4.9
- Bump @lage-run/reporters to v0.2.23

## 0.4.12

Sat, 08 Oct 2022 19:11:01 GMT

### Patches

- Bump @lage-run/scheduler to v0.4.8

## 0.4.11

Sat, 08 Oct 2022 18:44:41 GMT

### Patches

- Bump @lage-run/scheduler to v0.4.7

## 0.4.10

Sat, 08 Oct 2022 17:43:37 GMT

### Patches

- adding a watch mode action (ken@gizzar.com)
- Bump @lage-run/scheduler to v0.4.6
- Bump @lage-run/reporters to v0.2.22

## 0.4.9

Thu, 06 Oct 2022 16:46:54 GMT

### Patches

- expose ignore option for since in cli (email not defined)

## 0.4.8

Thu, 06 Oct 2022 16:07:29 GMT

### Patches

- adding logger to the constructor of the backfillCacheProvider usages (ken@gizzar.com)
- Bump @lage-run/scheduler to v0.4.5
- Bump @lage-run/cache to v0.1.19
- Bump @lage-run/reporters to v0.2.21

## 0.4.7

Thu, 06 Oct 2022 04:37:18 GMT

### Patches

- Bump @lage-run/scheduler to v0.4.4
- Bump @lage-run/reporters to v0.2.20

## 0.4.6

Wed, 05 Oct 2022 23:59:29 GMT

### Patches

- Remove hack to get support backfill config in pr.yml (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.4.3
- Bump @lage-run/cache to v0.1.18
- Bump @lage-run/reporters to v0.2.19

## 0.4.5

Wed, 05 Oct 2022 20:00:31 GMT

### Patches

- Bump @lage-run/scheduler to v0.4.2
- Bump @lage-run/cache to v0.1.17
- Bump @lage-run/reporters to v0.2.18

## 0.4.4

Wed, 05 Oct 2022 03:31:04 GMT

### Patches

- Fixes remote cache configuration for when environment variables are used instead of the config file (ken@gizzar.com)

## 0.4.3

Tue, 04 Oct 2022 21:39:20 GMT

### Patches

- Support async configs in v2+ (kchau@microsoft.com)

## 0.4.2

Tue, 04 Oct 2022 20:18:09 GMT

### Patches

- Bump @lage-run/scheduler to v0.4.1

## 0.4.1

Tue, 04 Oct 2022 15:51:44 GMT

### Patches

- actually publish runners and workers (kchau@microsoft.com)

## 0.4.0

Tue, 04 Oct 2022 03:38:54 GMT

### Minor changes

- Uses the new scheduler (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.4.0
- Bump @lage-run/reporters to v0.2.17

## 0.3.19

Mon, 03 Oct 2022 20:41:25 GMT

### Patches

- moved reporters init code in @lage-run/reporters (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.3.14
- Bump @lage-run/reporters to v0.2.16

## 0.3.18

Mon, 03 Oct 2022 19:57:28 GMT

### Patches

- Bump @lage-run/scheduler to v0.3.13
- Bump @lage-run/target-graph to v0.4.2
- Bump @lage-run/cache to v0.1.16
- Bump @lage-run/reporters to v0.2.15

## 0.3.17

Mon, 03 Oct 2022 00:06:54 GMT

### Patches

- factoring out scheduler types to a new package (ken@gizzar.com)
- Bump @lage-run/scheduler to v0.3.12
- Bump @lage-run/reporters to v0.2.14

## 0.3.16

Sat, 01 Oct 2022 16:21:41 GMT

### Patches

- uses the new find-npm-client packge (ken@gizzar.com)
- Bump @lage-run/scheduler to v0.3.11
- Bump @lage-run/target-graph to v0.4.1
- Bump @lage-run/cache to v0.1.15
- Bump @lage-run/reporters to v0.2.13

## 0.3.15

Sat, 01 Oct 2022 15:29:50 GMT

### Patches

- displays any errors before exiting (from lage itself, not the tasks) (ken@gizzar.com)
- Bump @lage-run/scheduler to v0.3.10
- Bump @lage-run/target-graph to v0.4.0
- Bump @lage-run/cache to v0.1.14
- Bump @lage-run/reporters to v0.2.12

## 0.3.14

Sat, 01 Oct 2022 06:41:42 GMT

### Patches

- Bump @lage-run/scheduler to v0.3.9
- Bump @lage-run/target-graph to v0.3.5
- Bump @lage-run/cache to v0.1.13
- Bump @lage-run/reporters to v0.2.11

## 0.3.13

Sat, 01 Oct 2022 05:25:29 GMT

### Patches

- Bump @lage-run/scheduler to v0.3.8
- Bump @lage-run/reporters to v0.2.10

## 0.3.12

Fri, 30 Sep 2022 23:00:17 GMT

### Patches

- Bump @lage-run/scheduler to v0.3.7
- Bump @lage-run/reporters to v0.2.9

## 0.3.11

Fri, 30 Sep 2022 16:50:18 GMT

### Patches

- Add colors to the default logger in v2 (phillip.burch@live.com)
- Bump @lage-run/reporters to v0.2.8

## 0.3.10

Thu, 29 Sep 2022 21:54:45 GMT

### Patches

- Update dependency workspace-tools to ^0.28.0 (email not defined)
- Bump @lage-run/scheduler to v0.3.6
- Bump @lage-run/target-graph to v0.3.4
- Bump @lage-run/cache to v0.1.12
- Bump @lage-run/reporters to v0.2.7

## 0.3.9

Wed, 21 Sep 2022 23:32:29 GMT

### Patches

- Making these corrections so that the dependencies and --no-dependents (dependents option) are correctly parsed and used in the program. (email not defined)

## 0.3.8

Mon, 19 Sep 2022 05:03:56 GMT

### Patches

- Bump @lage-run/scheduler to v0.3.5
- Bump @lage-run/target-graph to v0.3.3
- Bump @lage-run/cache to v0.1.11
- Bump @lage-run/reporters to v0.2.6

## 0.3.7

Mon, 19 Sep 2022 03:33:34 GMT

### Patches

- fix default fallback (ken@gizzar.com)

## 0.3.6

Sat, 17 Sep 2022 20:20:49 GMT

### Patches

- Fixing logging in workerpools to not be out of order (ken@gizzar.com)
- Bump @lage-run/scheduler to v0.3.4
- Bump @lage-run/reporters to v0.2.5

## 0.3.5

Sat, 17 Sep 2022 01:09:34 GMT

### Patches

- Update dependency workspace-tools to ^0.27.0 (email not defined)
- Bump @lage-run/scheduler to v0.3.3
- Bump @lage-run/target-graph to v0.3.2
- Bump @lage-run/cache to v0.1.10
- Bump @lage-run/reporters to v0.2.4

## 0.3.4

Fri, 16 Sep 2022 23:45:26 GMT

### Patches

- Remove unused and non-exported path utilities (elcraig@microsoft.com)

## 0.3.3

Fri, 16 Sep 2022 01:32:24 GMT

### Patches

- Bump @lage-run/scheduler to v0.3.2
- Bump @lage-run/cache to v0.1.9
- Bump @lage-run/reporters to v0.2.3

## 0.3.2

Thu, 15 Sep 2022 20:42:32 GMT

### Patches

- Adds back the support for "ignore"  (kchau@microsoft.com)

## 0.3.1

Tue, 06 Sep 2022 20:10:16 GMT

### Patches

- Bump @lage-run/scheduler to v0.3.1
- Bump @lage-run/target-graph to v0.3.1
- Bump @lage-run/cache to v0.1.8
- Bump @lage-run/reporters to v0.2.2

## 0.3.0

Sun, 04 Sep 2022 23:00:20 GMT

### Minor changes

- Supports workers as a new target type (ken@gizzar.com)
- Bump @lage-run/logger to v1.2.0
- Bump @lage-run/scheduler to v0.3.0
- Bump @lage-run/target-graph to v0.3.0
- Bump @lage-run/cache to v0.1.7
- Bump @lage-run/reporters to v0.2.1

## 0.2.4

Fri, 26 Aug 2022 23:05:53 GMT

### Patches

- get rid of memory-streams as a devDep (kchau@microsoft.com)

## 0.2.3

Fri, 26 Aug 2022 06:34:51 GMT

### Patches

- fixes cache cleaning to also clean the cached console outputs (ken@gizzar.com)
- Bump @lage-run/scheduler to v0.2.0
- Bump @lage-run/reporters to v0.2.0

## 0.2.2

Thu, 25 Aug 2022 20:06:40 GMT

### Patches

- Fixes where the reporter instances can be found (from logger instance) (kchau@microsoft.com)

## 0.2.1

Wed, 24 Aug 2022 22:26:03 GMT

### Patches

- Update dependency @types/node to v14.18.26 (renovate@whitesourcesoftware.com)
- Bump @lage-run/logger to v1.1.3
- Bump @lage-run/scheduler to v0.1.7
- Bump @lage-run/target-graph to v0.2.2
- Bump @lage-run/cache to v0.1.6
- Bump @lage-run/reporters to v0.1.6

## 0.2.0

Wed, 24 Aug 2022 20:50:50 GMT

### Minor changes

- adds cache command (ken@gizzar.com)

## 0.1.4

Wed, 24 Aug 2022 16:23:48 GMT

### Patches

- Bump @lage-run/scheduler to v0.1.6
- Bump @lage-run/cache to v0.1.5
- Bump @lage-run/reporters to v0.1.5

## 0.1.3

Wed, 24 Aug 2022 15:22:38 GMT

### Patches

- Update dependency workspace-tools to ^0.26.0 (renovate@whitesourcesoftware.com)
- Bump @lage-run/scheduler to v0.1.5
- Bump @lage-run/target-graph to v0.2.1
- Bump @lage-run/cache to v0.1.4
- Bump @lage-run/reporters to v0.1.4

## 0.1.2

Tue, 23 Aug 2022 21:26:23 GMT

### Patches

- Adds the --profile flag (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.1.4
- Bump @lage-run/reporters to v0.1.3

## 0.1.1

Tue, 23 Aug 2022 07:53:50 GMT

### Patches

- New package - patch bump to get it deployed! (ken@gizzar.com)
- Bump @lage-run/logger to v1.1.2
- Bump @lage-run/scheduler to v0.1.3
- Bump @lage-run/cache to v0.1.3
- Bump @lage-run/reporters to v0.1.2
