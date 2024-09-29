# Change Log - @lage-run/worker-threads-pool

<!-- This log was last generated on Fri, 27 Sep 2024 20:03:49 GMT and should not be manually modified. -->

<!-- Start content -->

## 0.8.2

Fri, 27 Sep 2024 20:03:49 GMT

### Patches

- adds an idle event emit (kchau@microsoft.com)

## 0.8.1

Wed, 11 Sep 2024 20:30:48 GMT

### Patches

- Bump @lage-run/logger to v1.3.1

## 0.8.0

Fri, 26 May 2023 20:44:05 GMT

### Minor changes

- Dynamic pooling by firing up 2 workers as a start, then adding new workers as work comes in (kchau@microsoft.com)

## 0.7.1

Fri, 19 May 2023 22:10:20 GMT

### Patches

- crash immediate on OOM in worker (not the memory leak case) (kchau@microsoft.com)

## 0.7.0

Mon, 08 May 2023 22:27:16 GMT

### Minor changes

- Adds ability to communicate with postMessage in the ThreadWorker (kchau@microsoft.com)

## 0.6.1

Tue, 25 Apr 2023 02:51:19 GMT

### Patches

- Update repository and homepage (elcraig@microsoft.com)
- Bump @lage-run/logger to v1.3.0

## 0.6.0

Thu, 30 Mar 2023 23:46:52 GMT

### Minor changes

- moved caching to happen inside workers (kchau@microsoft.com)

## 0.5.1

Wed, 29 Mar 2023 22:41:49 GMT

### Patches

- moving config to its own package (kchau@microsoft.com)

## 0.5.0

Wed, 16 Nov 2022 20:07:05 GMT

### Minor changes

- Refactoring the worker threads pool to use proper classes for Worker (kchau@microsoft.com)

## 0.4.5

Wed, 16 Nov 2022 17:12:24 GMT

### Patches

- adding a handling case for when lines are still being outputted but the worker is freed (kchau@microsoft.com)

## 0.4.4

Tue, 01 Nov 2022 22:48:33 GMT

### Patches

- get rid of third party abort-controller impl (kchau@microsoft.com)

## 0.4.3

Tue, 01 Nov 2022 22:25:59 GMT

### Patches

- adds import extensions of .js to prepare of esmodule switchover (kchau@microsoft.com)
- Bump @lage-run/logger to v1.2.2

## 0.4.2

Tue, 01 Nov 2022 20:43:17 GMT

### Patches

- cleaning up the tsconfig files (kchau@microsoft.com)
- Bump @lage-run/logger to v1.2.1

## 0.4.1

Mon, 31 Oct 2022 21:27:52 GMT

### Patches

- adds depcheck and fixes (kchau@microsoft.com)

## 0.4.0

Sat, 29 Oct 2022 01:06:17 GMT

### Minor changes

- adds memory limit + restart capability (kchau@microsoft.com)

## 0.3.0

Wed, 26 Oct 2022 22:01:13 GMT

### Minor changes

- adds support for weighted targets (kchau@microsoft.com)

## 0.2.0

Fri, 21 Oct 2022 21:36:38 GMT

### Minor changes

- Creates a new AggregatedPool that abstracts different pools that take on tasks grouped by task name (ken@gizzar.com)

## 0.1.7

Thu, 06 Oct 2022 04:37:18 GMT

### Patches

- fixes stdio streams capturing so the logs belong to the right worker and task (kchau@microsoft.com)

## 0.1.6

Tue, 04 Oct 2022 03:38:54 GMT

### Patches

- Make doubly sure pool is shutdown before showing a summary (kchau@microsoft.com)

## 0.1.5

Mon, 03 Oct 2022 20:41:25 GMT

### Patches

- adds support for abort signal (kchau@microsoft.com)

## 0.1.4

Sat, 01 Oct 2022 05:25:29 GMT

### Patches

- adds a stdio cpature inside threadpool (ken@gizzar.com)

## 0.1.3

Fri, 30 Sep 2022 23:00:17 GMT

### Patches

- get rid of "node:" (kchau@microsoft.com)

## 0.1.2

Sat, 17 Sep 2022 20:20:49 GMT

### Patches

- Get rid of unneeded hack around stream pipe (ken@gizzar.com)

## 0.1.1

Sun, 04 Sep 2022 23:00:20 GMT

### Patches

- Supports worker as a new target type (ken@gizzar.com)
