# Change Log - @lage-run/cli

This log was last generated on Thu, 06 Oct 2022 16:46:54 GMT and should not be manually modified.

<!-- Start content -->

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
