# Change Log - lage

This log was last generated on Mon, 30 Nov 2020 19:57:05 GMT and should not be manually modified.

<!-- Start content -->

## 0.26.2

Mon, 30 Nov 2020 19:57:05 GMT

### Patches

- increase max buffer to 500MB and fail-fast on other git issues in workspace-tools (kchau@microsoft.com)

## 0.26.1

Mon, 16 Nov 2020 23:08:23 GMT

### Patches

- refactor: Create npm script task config (oliver.kuruma@gmail.com)

## 0.26.0

Mon, 16 Nov 2020 23:03:30 GMT

### Minor changes

- feat: Add --include-dependencies option (oliver.kuruma@gmail.com)

## 0.25.0

Mon, 16 Nov 2020 12:28:34 GMT

### Minor changes

- feat: Add --safe-exit option (oliver.kuruma@gmail.com)

## 0.24.0

Thu, 22 Oct 2020 22:44:30 GMT

### Minor changes

- adding a feature to let the job to run as far as it can before failing (kchau@microsoft.com)

## 0.23.0

Tue, 20 Oct 2020 00:08:10 GMT

### Minor changes

- adding an ability to deal with unknown commands (kchau@microsoft.com)

## 0.22.1

Mon, 19 Oct 2020 22:01:22 GMT

### Patches

- have the errors appear more prominently (kchau@microsoft.com)

## 0.22.0

Mon, 19 Oct 2020 21:25:12 GMT

### Minor changes

- provide a way to write out profile data to custom path (kchau@microsoft.com)

## 0.21.1

Mon, 19 Oct 2020 20:42:00 GMT

### Patches

- bumps workspace-tools and cleaned up deps a bit (kchau@microsoft.com)

## 0.21.0

Mon, 19 Oct 2020 19:52:06 GMT

### Minor changes

- adding a sigterm -> sigkill strategy for killing active processes (kchau@microsoft.com)

## 0.20.0

Mon, 19 Oct 2020 16:39:05 GMT

### Minor changes

- Use getWorkspaceRoot to determine where the root of the Lage project is. (dannyvv@microsoft.com)

## 0.19.12

Thu, 15 Oct 2020 00:45:11 GMT

### Patches

- make sure the exit code is 1 if a cycle is detected (kchau@microsoft.com)

## 0.19.11

Mon, 12 Oct 2020 18:50:15 GMT

### Patches

- Include full stacks with error messages (elcraig@microsoft.com)

## 0.19.10

Thu, 08 Oct 2020 00:13:55 GMT

### Patches

- adding renovate (kchau@microsoft.com)

## 0.19.9

Mon, 05 Oct 2020 20:09:57 GMT

### Patches

- bumps task-scheduler (kchau@microsoft.com)

## 0.19.8

Tue, 15 Sep 2020 17:54:15 GMT

### Patches

- bumps the workspace-tools (kchau@microsoft.com)

## 0.19.7

Tue, 15 Sep 2020 01:37:39 GMT

### Patches

- adding cli options (kchau@microsoft.com)

## 0.19.6

Wed, 26 Aug 2020 20:50:03 GMT

### Patches

- bump task-scheduler to handle no-deps case (kchau@microsoft.com)

## 0.19.5

Thu, 20 Aug 2020 00:46:19 GMT

### Patches

- Make sure repowidechanges setting is separate from cache hash calculation (kchau@microsoft.com)

## 0.19.4

Thu, 20 Aug 2020 00:31:59 GMT

### Patches

- make sure repo wide changes are respected for build scoping (kchau@microsoft.com)

## 0.19.3

Wed, 19 Aug 2020 23:35:01 GMT

### Patches

- Fixing the issue with scope & since getting incorrect filtered package results (#66) (kchau@microsoft.com)

## 0.19.2

Sun, 16 Aug 2020 16:35:11 GMT

### Patches

- fixed the delimiter to use something uncommon (kchau@microsoft.com)

## 0.19.1

Sun, 16 Aug 2020 16:24:19 GMT

### Patches

- fixed the case to not over build (kchau@microsoft.com)

## 0.19.0

Fri, 14 Aug 2020 18:52:50 GMT

### Minor changes

- Adds a way to specify individual package task dependency (kchau@microsoft.com)

## 0.18.0

Thu, 13 Aug 2020 19:16:47 GMT

### Minor changes

- adds an info command that lists out the package task dep graph (kchau@microsoft.com)

## 0.17.5

Sun, 09 Aug 2020 03:51:50 GMT

### Patches

- bump workspace-tools (kchau@microsoft.com)

## 0.17.4

Fri, 07 Aug 2020 02:03:25 GMT

### Patches

- making the logging of skipped tasks to report correct times (kchau@microsoft.com)

## 0.17.3

Thu, 06 Aug 2020 20:03:11 GMT

### Patches

- fixing up the logs for cache hashes (kchau@microsoft.com)

## 0.17.2

Thu, 06 Aug 2020 18:22:32 GMT

### Patches

- Fixing logs when errors happen (kchau@microsoft.com)

## 0.17.1

Thu, 06 Aug 2020 01:26:51 GMT

### Patches

- fix new passthrough args for CliOptions (kchau@microsoft.com)

## 0.17.0

Thu, 06 Aug 2020 00:03:45 GMT

### Minor changes

- Changing the logger to allow json mode and adding real e2e tests for orders (kchau@microsoft.com)

## 0.16.1

Fri, 24 Jul 2020 19:34:33 GMT

### Patches

- Compatible changes to make docs show up better (kchau@microsoft.com)

## 0.16.0

Thu, 23 Jul 2020 00:11:11 GMT

### Minor changes

- adding an init interface (kchau@microsoft.com)

## 0.15.4

Fri, 17 Jul 2020 20:33:49 GMT

### Patches

- fixes args (kchau@microsoft.com)

## 0.15.3

Fri, 17 Jul 2020 19:31:44 GMT

### Patches

- bump workspace tools to get new preferred workspace manager (kchau@microsoft.com)

## 0.15.2

Wed, 15 Jul 2020 19:52:24 GMT

### Patches

- Increase default concurrency to os.cpus().length (1581488+christiango@users.noreply.github.com)

## 0.15.1

Wed, 15 Jul 2020 19:01:09 GMT

### Patches

- fix default case with no priorities set (kchau@microsoft.com)

## 0.15.0

Wed, 15 Jul 2020 16:36:28 GMT

### Minor changes

- Add support for task prioritization (1581488+christiango@users.noreply.github.com)

## 0.14.0

Mon, 13 Jul 2020 23:09:45 GMT

### Minor changes

- adding a --only for picking certain tasks (kchau@microsoft.com)

## 0.13.5

Fri, 10 Jul 2020 18:11:23 GMT

### Patches

- Move profiler output to the system tmp dir (feescoto@microsoft.com)

## 0.13.4

Mon, 29 Jun 2020 21:04:38 GMT

### Patches

- fixed a bug where an exception thrown from getPackageDeps will affect how things are cached (kchau@microsoft.com)

## 0.13.3

Fri, 19 Jun 2020 18:49:29 GMT

### Patches

- adding scoped packages back into the transitive providers (kchau@microsoft.com)

## 0.13.2

Fri, 19 Jun 2020 18:08:51 GMT

### Patches

- fixing the intersection calculate with the differnce between transitive consumers and providers (kchau@microsoft.com)

## 0.13.1

Thu, 18 Jun 2020 23:47:16 GMT

### Patches

- making filterpackage do intersection rather than union. adding tests (kchau@microsoft.com)

## 0.13.0

Thu, 18 Jun 2020 19:56:16 GMT

### Minor changes

- adding a environment variable LAGE_PACKAGE_NAME like Lerna (kchau@microsoft.com)

## 0.12.5

Wed, 17 Jun 2020 19:41:31 GMT

### Patches

- Bump task-scheduler to make the graph respect tasks with no deps (kchau@microsoft.com)

## 0.12.4

Tue, 16 Jun 2020 22:07:08 GMT

### Patches

- adding a resetCache flag to resave cache if something went awry (kchau@microsoft.com)

## 0.12.3

Mon, 15 Jun 2020 20:13:31 GMT

### Patches

- unphantomify backfill (kchau@microsoft.com)

## 0.12.2

Thu, 11 Jun 2020 00:14:19 GMT

### Patches

- include os.platform in the hash (kchau@microsoft.com)

## 0.12.1

Tue, 09 Jun 2020 19:51:48 GMT

### Patches

- get rid of all newline characters in a line (kchau@microsoft.com)

## 0.12.0

Tue, 09 Jun 2020 04:44:04 GMT

### Minor changes

- need to handle the close signal as well as exit (kchau@microsoft.com)

## 0.11.2

Mon, 08 Jun 2020 23:47:43 GMT

### Patches

- fixed a bug with the since flag so that an empty is defaulted to origin/master (kchau@microsoft.com)

## 0.11.1

Mon, 08 Jun 2020 23:46:49 GMT

### Patches

- bump websocket-extensions (kchau@microsoft.com)

## 0.11.0

Sun, 07 Jun 2020 17:56:33 GMT

### Minor changes

- salt with environmentGlob (kchau@microsoft.com)

## 0.10.1

Sat, 06 Jun 2020 19:33:34 GMT

### Patches

- bump backfill (kchau@microsoft.com)

## 0.10.0

Fri, 05 Jun 2020 23:31:46 GMT

### Minor changes

- per task caching (kchau@microsoft.com)

## 0.9.2

Fri, 05 Jun 2020 16:33:19 GMT

### Patches

- fixing hash! (kchau@microsoft.com)

## 0.9.1

Thu, 04 Jun 2020 17:04:06 GMT

### Patches

- fixed the ignore param so that it works! (kchau@microsoft.com)

## 0.9.0

Thu, 04 Jun 2020 00:21:21 GMT

### Minor changes

- refactored internally to use @microsoft/task-scheduler (kchau@microsoft.com)

## 0.8.2

Thu, 28 May 2020 23:14:00 GMT

### Patches

- refactor to reduce the scope of what gets run in a scoped run (kchau@microsoft.com)

## 0.8.1

Thu, 28 May 2020 19:07:51 GMT

### Patches

- internal refactoring for discoverTaskDeps (kchau@microsoft.com)

## 0.8.0

Tue, 26 May 2020 18:54:57 GMT

### Minor changes

- add support for running command with different npm clients (kchau@microsoft.com)

## 0.7.2

Tue, 26 May 2020 00:18:08 GMT

### Patches

- change to p-profiler instead of @lerna/profiler (kchau@microsoft.com)

## 0.7.1

Mon, 25 May 2020 19:49:21 GMT

### Patches

- fixing the correct check for typeof since (kchau@microsoft.com)

## 0.7.0

Mon, 25 May 2020 18:26:19 GMT

### Minor changes

- adding handling for multiple args (kchau@microsoft.com)

## 0.6.2

Sun, 24 May 2020 23:10:13 GMT

### Patches

- make sure no outputglob match do not crash (kchau@microsoft.com)

## 0.6.1

Sun, 24 May 2020 22:01:39 GMT

### Patches

- fix cache directory (kchau@microsoft.com)

## 0.6.0

Sun, 24 May 2020 04:36:58 GMT

### Minor changes

- adding cacheOptions to lage.config.js (kchau@microsoft.com)

## 0.5.0

Sat, 23 May 2020 23:20:06 GMT

### Minor changes

- adding a --since feature (kchau@microsoft.com)

### Patches

- add support for untracked and unstaged files for --since (kchau@microsoft.com)

## 0.4.9

Fri, 22 May 2020 20:39:55 GMT

### Patches

- bumping backfill (kchau@microsoft.com)

## 0.4.8

Mon, 18 May 2020 23:19:09 GMT

### Patches

- adds link to repo from npm package metadata (kchau@microsoft.com)

## 0.4.7

Mon, 18 May 2020 16:25:15 GMT

### Patches

- update backfill to latest (kchau@microsoft.com)

## 0.4.6

Wed, 13 May 2020 23:30:10 GMT

### Patches

- fixing up npm cmd call so it's platform independent (kchau@microsoft.com)

## 0.4.5

Wed, 13 May 2020 22:42:02 GMT

### Patches

- more event listeners (kchau@microsoft.com)

## 0.4.4

Wed, 13 May 2020 18:47:23 GMT

### Patches

- allow tasks with no deps to run as well (kchau@microsoft.com)

## 0.4.3

Wed, 13 May 2020 16:37:33 GMT

### Patches

- truly respects the profile flag (kchau@microsoft.com)

## 0.4.2

Wed, 13 May 2020 16:28:31 GMT

### Patches

- added option to do profiling or not (kchau@microsoft.com)

## 0.4.1

Wed, 13 May 2020 01:58:36 GMT

### Patches

- added usage stuff (kchau@microsoft.com)

## 0.4.0

Wed, 13 May 2020 01:55:26 GMT

### Minor changes

- better logging (kchau@microsoft.com)

## 0.3.0

Wed, 13 May 2020 01:33:46 GMT

### Minor changes

- adding verbose logging (kchau@microsoft.com)

## 0.2.1

Wed, 13 May 2020 01:23:45 GMT

### Patches

- fixes the binary script (kchau@microsoft.com)

## 0.2.0

Wed, 13 May 2020 01:14:27 GMT

### Minor changes

- updated with latest and greatest backfill (kchau@microsoft.com)
