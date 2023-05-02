# Change Log - @lage-run/reporters

This log was last generated on Tue, 25 Apr 2023 02:51:19 GMT and should not be manually modified.

<!-- Start content -->

## 1.2.0

Tue, 25 Apr 2023 02:51:19 GMT

### Minor changes

- Add VerboseFileLogReporter, which writes verbose, ungrouped logs to a file (stchur@microsoft.com)
- Bump @lage-run/logger to v1.3.0
- Bump @lage-run/scheduler-types to v0.3.8
- Bump @lage-run/target-graph to v0.8.4

### Patches

- Update repository and homepage (elcraig@microsoft.com)

## 1.1.2

Fri, 14 Apr 2023 04:37:55 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.3.7
- Bump @lage-run/target-graph to v0.8.3

## 1.1.1

Thu, 06 Apr 2023 22:27:50 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.3.6
- Bump @lage-run/target-graph to v0.8.2

## 1.1.0

Sat, 01 Apr 2023 00:28:31 GMT

### Minor changes

- replace ink with @ms-cloudpack/task-reporter (kchau@microsoft.com)

## 1.0.7

Wed, 29 Mar 2023 22:41:49 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.3.5

## 1.0.6

Tue, 14 Mar 2023 00:28:38 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.3.4
- Bump @lage-run/target-graph to v0.8.1

## 1.0.5

Fri, 10 Mar 2023 01:25:03 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.3.3
- Bump @lage-run/target-graph to v0.8.0

## 1.0.4

Wed, 08 Mar 2023 00:05:27 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.3.2
- Bump @lage-run/target-graph to v0.7.0

## 1.0.3

Sat, 18 Feb 2023 00:43:33 GMT

### Patches

- ChromeTraceEventsReporter: Add task name to category (felescoto95@hotmail.com)

## 1.0.2

Sat, 18 Feb 2023 00:40:18 GMT

### Patches

- ChromeTraceEventsReporter: Hide skipped tasks from the profile (felescoto95@hotmail.com)

## 1.0.1

Wed, 15 Feb 2023 16:47:12 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.3.1
- Bump @lage-run/target-graph to v0.6.2

## 1.0.0

Tue, 31 Jan 2023 18:24:39 GMT

### Major changes

- removed the initialize reporter and create reporter APIs (please just instantiate them yourself!) (kchau@microsoft.com)

## 0.3.2

Mon, 30 Jan 2023 17:26:59 GMT

### Patches

- Add task error summary to ADO reporter (felescoto95@hotmail.com)

## 0.3.1

Fri, 27 Jan 2023 00:28:15 GMT

### Patches

- fixing profiler so that it will load correctly in the tracing UI (kchau@microsoft.com)

## 0.3.0

Wed, 18 Jan 2023 18:18:35 GMT

### Minor changes

- Using lage for prune and clear on cache and get reporter in shape for ADO (kchau@microsoft.com)
- Bump @lage-run/scheduler-types to v0.3.0
- Bump @lage-run/format-hrtime to v0.1.4

## 0.2.44

Thu, 05 Jan 2023 00:40:50 GMT

### Patches

- fixing progress bar to not be a bottleneck (kchau@microsoft.com)

## 0.2.43

Thu, 08 Dec 2022 00:49:28 GMT

### Patches

- adding some more niceties to progress reporter (kchau@microsoft.com)

## 0.2.42

Tue, 06 Dec 2022 23:28:12 GMT

### Patches

- fixes an array length issue (kchau@microsoft.com)

## 0.2.41

Tue, 06 Dec 2022 00:48:02 GMT

### Patches

- creating the beginnings of a progress reporter - it's in beta (kchau@microsoft.com)
- Bump @lage-run/scheduler-types to v0.2.10

## 0.2.40

Mon, 21 Nov 2022 06:32:03 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.2.9

## 0.2.39

Fri, 11 Nov 2022 07:29:47 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.2.8
- Bump @lage-run/target-graph to v0.6.1

## 0.2.38

Thu, 10 Nov 2022 20:20:45 GMT

### Patches

- get rid of getPackageAndTask references (kchau@microsoft.com)
- Bump @lage-run/scheduler-types to v0.2.7
- Bump @lage-run/target-graph to v0.6.0

## 0.2.37

Tue, 01 Nov 2022 22:48:33 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.2.6

## 0.2.36

Tue, 01 Nov 2022 22:25:59 GMT

### Patches

- adds import extensions of .js to prepare of esmodule switchover (kchau@microsoft.com)
- Bump @lage-run/logger to v1.2.2
- Bump @lage-run/scheduler-types to v0.2.5
- Bump @lage-run/target-graph to v0.5.3
- Bump @lage-run/format-hrtime to v0.1.3

## 0.2.35

Tue, 01 Nov 2022 20:43:17 GMT

### Patches

- cleaning up the tsconfig files (kchau@microsoft.com)
- Bump @lage-run/logger to v1.2.1
- Bump @lage-run/scheduler-types to v0.2.4
- Bump @lage-run/target-graph to v0.5.2
- Bump @lage-run/format-hrtime to v0.1.2

## 0.2.34

Mon, 31 Oct 2022 21:27:52 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.2.3

## 0.2.33

Sat, 29 Oct 2022 18:42:49 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.2.2
- Bump @lage-run/target-graph to v0.5.1

## 0.2.32

Sat, 29 Oct 2022 01:06:17 GMT

### Patches

- adds memory information from pool (kchau@microsoft.com)
- Bump @lage-run/scheduler-types to v0.2.1

## 0.2.31

Wed, 26 Oct 2022 22:01:13 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.2.0
- Bump @lage-run/target-graph to v0.5.0

## 0.2.30

Wed, 26 Oct 2022 00:02:06 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.1.16
- Bump @lage-run/target-graph to v0.4.5

## 0.2.29

Tue, 25 Oct 2022 00:06:49 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.1.15

## 0.2.28

Mon, 24 Oct 2022 21:40:05 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.1.14

## 0.2.27

Sun, 23 Oct 2022 04:31:57 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.1.13
- Bump @lage-run/target-graph to v0.4.4

## 0.2.26

Fri, 21 Oct 2022 21:36:38 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.1.12

## 0.2.25

Fri, 21 Oct 2022 19:33:09 GMT

### Patches

- Fixing Azure DevOps reporter to display grouping correctly (ken@gizzar.com)

## 0.2.24

Thu, 20 Oct 2022 00:22:27 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.1.11
- Bump @lage-run/target-graph to v0.4.3

## 0.2.23

Wed, 12 Oct 2022 21:07:14 GMT

### Patches

- use the separate format-hrtime package as well as display queue time separately (kchau@microsoft.com)
- Bump @lage-run/scheduler-types to v0.1.10
- Bump @lage-run/format-hrtime to v0.1.1

## 0.2.22

Sat, 08 Oct 2022 17:43:37 GMT

### Patches

- adding a watch mode action (ken@gizzar.com)
- Bump @lage-run/scheduler-types to v0.1.9

## 0.2.21

Thu, 06 Oct 2022 16:07:29 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.1.8

## 0.2.20

Thu, 06 Oct 2022 04:37:18 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.1.7

## 0.2.19

Wed, 05 Oct 2022 23:59:29 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.1.6

## 0.2.18

Wed, 05 Oct 2022 20:00:31 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.1.5

## 0.2.17

Tue, 04 Oct 2022 03:38:54 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.1.4

## 0.2.16

Mon, 03 Oct 2022 20:41:25 GMT

### Patches

- moved init code into @lage-run/reporters from @lage-run/cli (kchau@microsoft.com)
- Bump @lage-run/scheduler-types to v0.1.3

## 0.2.15

Mon, 03 Oct 2022 19:57:28 GMT

### Patches

- Bump @lage-run/scheduler-types to v0.1.2
- Bump @lage-run/target-graph to v0.4.2

## 0.2.14

Mon, 03 Oct 2022 00:06:54 GMT

### Patches

- factoring out scheduler types to a new package (ken@gizzar.com)
- Bump @lage-run/scheduler-types to v0.1.1

## 0.2.13

Sat, 01 Oct 2022 16:21:41 GMT

### Patches

- addressing no-console rule (ken@gizzar.com)
- Bump @lage-run/scheduler to v0.3.11
- Bump @lage-run/target-graph to v0.4.1

## 0.2.12

Sat, 01 Oct 2022 15:29:50 GMT

### Patches

- Bump @lage-run/scheduler to v0.3.10
- Bump @lage-run/target-graph to v0.4.0

## 0.2.11

Sat, 01 Oct 2022 06:41:42 GMT

### Patches

- Bump @lage-run/scheduler to v0.3.9
- Bump @lage-run/target-graph to v0.3.5

## 0.2.10

Sat, 01 Oct 2022 05:25:29 GMT

### Patches

- Bump @lage-run/scheduler to v0.3.8

## 0.2.9

Fri, 30 Sep 2022 23:00:17 GMT

### Patches

- Bump @lage-run/scheduler to v0.3.7

## 0.2.8

Fri, 30 Sep 2022 16:50:18 GMT

### Patches

- Add colors to the default logger in v2 (phillip.burch@live.com)

## 0.2.7

Thu, 29 Sep 2022 21:54:45 GMT

### Patches

- Bump @lage-run/scheduler to v0.3.6
- Bump @lage-run/target-graph to v0.3.4

## 0.2.6

Mon, 19 Sep 2022 05:03:56 GMT

### Patches

- Bump @lage-run/scheduler to v0.3.5
- Bump @lage-run/target-graph to v0.3.3

## 0.2.5

Sat, 17 Sep 2022 20:20:49 GMT

### Patches

- Bump @lage-run/scheduler to v0.3.4

## 0.2.4

Sat, 17 Sep 2022 01:09:34 GMT

### Patches

- Bump @lage-run/scheduler to v0.3.3
- Bump @lage-run/target-graph to v0.3.2

## 0.2.3

Fri, 16 Sep 2022 01:32:24 GMT

### Patches

- Bump @lage-run/scheduler to v0.3.2

## 0.2.2

Tue, 06 Sep 2022 20:10:16 GMT

### Patches

- Logs summary correctly for global targets (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.3.1
- Bump @lage-run/target-graph to v0.3.1

## 0.2.1

Sun, 04 Sep 2022 23:00:20 GMT

### Patches

- Bump @lage-run/logger to v1.2.0
- Bump @lage-run/scheduler to v0.3.0
- Bump @lage-run/target-graph to v0.3.0

## 0.2.0

Fri, 26 Aug 2022 06:34:51 GMT

### Minor changes

- beautifying the output (ken@gizzar.com)
- Bump @lage-run/scheduler to v0.2.0

## 0.1.6

Wed, 24 Aug 2022 22:26:03 GMT

### Patches

- Update dependency @types/node to v14.18.26 (renovate@whitesourcesoftware.com)
- Bump @lage-run/logger to v1.1.3
- Bump @lage-run/scheduler to v0.1.7
- Bump @lage-run/target-graph to v0.2.2

## 0.1.5

Wed, 24 Aug 2022 16:23:48 GMT

### Patches

- Bump @lage-run/scheduler to v0.1.6

## 0.1.4

Wed, 24 Aug 2022 15:22:38 GMT

### Patches

- Bump @lage-run/scheduler to v0.1.5
- Bump @lage-run/target-graph to v0.2.1

## 0.1.3

Tue, 23 Aug 2022 21:26:23 GMT

### Patches

- Adds the ChromeTraceEventReporters that is used in --profile (kchau@microsoft.com)
- Bump @lage-run/scheduler to v0.1.4

## 0.1.2

Tue, 23 Aug 2022 07:53:50 GMT

### Patches

- Be sure to hide the __start target id from reporters (ken@gizzar.com)
- Bump @lage-run/logger to v1.1.2
- Bump @lage-run/scheduler to v0.1.3

## 0.1.1

Thu, 11 Aug 2022 23:52:59 GMT

### Patches

- Brand new reporter package for lage v2 (kchau@microsoft.com)
- Bump @lage-run/logger to v1.1.1
- Bump @lage-run/scheduler to v0.1.2
