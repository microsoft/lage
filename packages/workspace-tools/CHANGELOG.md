# Change Log - workspace-tools

<!-- This log was last generated on Thu, 26 Mar 2026 19:53:28 GMT and should not be manually modified. -->

<!-- Start content -->

## 0.41.1

Thu, 26 Mar 2026 19:53:28 GMT

### Patches

- Publish workspace-tools from lage repo (elcraig@microsoft.com)
- Clarify comments and deprecate findWorkspacePath (elcraig@microsoft.com)

## 0.41.0

Tue, 03 Feb 2026 19:35:32 GMT

### Minor changes

**BREAKING:** Various breaking changes to workspace package utilities ([#388](https://github.com/microsoft/workspace-tools/pull/388)):

The following APIs have been renamed for clarity, removed entirely, or consolidated:

| Old (removed)                 | New                                    |
| ----------------------------- | -------------------------------------- |
| `getWorkspaces`               | `getWorkspaceInfos`                    |
| `getWorkspacesAsync`          | `getWorkspaceInfosAsync`               |
| `WorkspaceInfo`               | `WorkspaceInfos`                       |
| `getWorkspaceRoot`            | `getWorkspaceManagerRoot`              |
| `listOfWorkspacePackageNames` | `workspaces.map(w => w.name)`          |
| `getPnpmWorkspaceRoot`        | `getWorkspaceManagerRoot(cwd, 'pnpm')` |
| `getRushWorkspaceRoot`        | `getWorkspaceManagerRoot(cwd, 'rush')` |
| `getYarnWorkspaceRoot`        | `getWorkspaceManagerRoot(cwd, 'yarn')` |
| `getPnpmWorkspaces`           | `getWorkspaceInfos(cwd, 'pnpm')`       |
| `getRushWorkspaces`           | `getWorkspaceInfos(cwd, 'rush')`       |
| `getYarnWorkspaces`           | `getWorkspaceInfos(cwd, 'yarn')`       |

Other changes:

- Several functions now return `string[] | undefined` instead of returning an empty array on error:
  - `getAllPackageJsonFiles`, `getAllPackageJsonFilesAsync`
  - `getWorkspacePackagePaths`, `getWorkspacePackagePathsAsync`
  - `getWorkspaceInfos`, `getWorkspaceInfosAsync`
- `getWorkspaceManagerAndRoot` is now exported if you want to know the manager as well as the root
- Several functions now have a `manager` param to force using a specific manager:
  - `getWorkspaceManagerRoot`
  - `findProjectRoot` (falls back to the git root and throws if neither is found)
  - `getWorkspacePackagePaths`, `getWorkspacePackagePathsAsync`
  - `getWorkspacePatterns` (new)
  - `getWorkspaceInfos`, `getWorkspaceInfosAsync`
  - `getCatalogs`
- Some related files have been moved or renamed internally, so deep imports may be broken. Please check the current top-level API to see if the utility you were deep-importing is now exported, and file an issue if not.

### Patches

- Cleanup and docs for graph APIs (elcraig@microsoft.com)

## 0.40.4

Thu, 22 Jan 2026 02:01:03 GMT

### Patches

- Deprecate `getWorkspaces` and rename to `getWorkspaceInfos` (same with async version) (elcraig@microsoft.com)

## 0.40.3

Tue, 13 Jan 2026 00:02:46 GMT

### Patches

- Clarify "workspace" terminology (elcraig@microsoft.com)

## 0.40.2

Thu, 18 Dec 2025 23:51:04 GMT

### Patches

- Update handling of "catalog:" vs "catalog:default" and add catalogsToYaml utility (elcraig@microsoft.com)

## 0.40.0

Tue, 25 Nov 2025 01:51:29 GMT

### Minor changes

- Convert most git helpers to use object param signatures with customizable error handling. (Old signatures are deprecated but still available.) (elcraig@microsoft.com)

### Patches

- Clarify getChangedPackages behavior (elcraig@microsoft.com)

## 0.38.6

Fri, 14 Nov 2025 22:14:21 GMT

### Patches

- Rename `readPackageInfo` to `getPackageInfo` (elcraig@microsoft.com)
- Error on recursive catalog versions (elcraig@microsoft.com)

## 0.38.5

Fri, 14 Nov 2025 21:48:11 GMT

### Patches

- Add catalog helpers `getCatalogs` and `getCatalogVersion` (elcraig@microsoft.com)
- Replace confusing `WorkspaceInfo` array type with `WorkspaceInfos` type, and add `WorkspacePackageInfo` type for array entries.
- Deprecate `getWorkspaceRoot` in favor of `getWorkspaceManagerRoot`, and clarify doc comments regarding "workspace" terminology.
- Introduce ~~`readPackageInfo`~~ *(renamed to `getPackageInfo` in next version)* helper for reading package.json files.
- Add missing doc comments (elcraig@microsoft.com)

## 0.38.4

Thu, 17 Apr 2025 02:50:51 GMT

### Patches

- Update `git-url-parse` to v16, and modify `getRepositoryName` URL checks. There's a slight chance this could change behavior for less-common URL formats. (elcraig@microsoft.com)
- Update `git()` to always set `shell: false` and validate that the `--upload-pack` option is not provided (elcraig@microsoft.com)

## 0.38.3

Mon, 14 Apr 2025 22:35:08 GMT

### Patches

- Export getPackageDependencies (elcraig@microsoft.com)

## 0.38.2

Mon, 24 Mar 2025 21:48:16 GMT

### Patches

- Limit git rev-list to one result (rsiemens@microsoft.com)

## 0.38.1

Wed, 13 Nov 2024 08:01:48 GMT

### Patches

- processGitOutput should throw when stderr is defined (email not defined)

## 0.38.0

Sat, 02 Nov 2024 08:01:50 GMT

### Minor changes

- adding optional dependency filtering (nemanjatesic@microsoft.com)

## 0.37.0

Sat, 19 Oct 2024 08:01:45 GMT

### Minor changes

- fixing graph generation to skip non-internal packages based on the protocol (kchau@microsoft.com)

## 0.36.4

Mon, 11 Dec 2023 23:58:13 GMT

### Patches

- Support case-insensitive package name match (stchur@microsoft.com)

## 0.36.3

Wed, 18 Oct 2023 22:14:54 GMT

### Patches

- Update readme (elcraig@microsoft.com)

## 0.36.2

Wed, 18 Oct 2023 06:44:38 GMT

### Patches

- Go back to transpiling to ES2020 (elcraig@microsoft.com)
- Use trimEnd instead of trimRight (elcraig@microsoft.com)

## 0.36.1

Wed, 18 Oct 2023 05:45:05 GMT

### Patches

- Go back to transpiling to ES2021 (elcraig@microsoft.com)

## 0.36.0

Wed, 18 Oct 2023 05:00:25 GMT

### Minor changes

- Update to TypeScript to 5.2 and transpile to ES2022 syntax (Node 16+). Dependencies requiring Node 16 may also be introduced after this point. (elcraig@microsoft.com)

## 0.35.3

Wed, 18 Oct 2023 04:16:22 GMT

### Patches

- getRecentCommitMessages: filter out empty lines (elcraig@microsoft.com)

## 0.35.2

Tue, 05 Sep 2023 21:12:43 GMT

### Patches

- searchUp: handle relative cwd (elcraig@microsoft.com)

## 0.35.1

Fri, 01 Sep 2023 01:20:47 GMT

### Patches

- Adding fast-glob to deps list. (dzearing@microsoft.com)

## 0.35.0

Sat, 15 Jul 2023 08:02:42 GMT

### Minor changes

- adding support for async getWorspaces (kchau@microsoft.com)

## 0.34.6

Wed, 17 May 2023 01:25:45 GMT

### Patches

- un-deprecate getTransitive functions (kchau@microsoft.com)

## 0.34.2

Tue, 09 May 2023 21:21:56 GMT

### Patches

- Add full spawnSync result to git helper (elcraig@microsoft.com)

## 0.34.1

Thu, 04 May 2023 18:32:10 GMT

### Patches

- Add `setCachingEnabled` API so caching can be disabled for tests (elcraig@microsoft.com)

## 0.34.0

Thu, 13 Apr 2023 20:39:59 GMT

### Minor changes

- Fix `getPackageInfos` to only read package.jsons once, and `getAllPackageJsonFiles` (which only returns paths) to not read the files at all. There's also a new API `getWorkspacePackagePaths` which allows consumers to make the same optimization. (elcraig@microsoft.com)

## 0.33.0

Thu, 13 Apr 2023 08:01:43 GMT

### Minor changes

- Improve workspace manager utility naming. None of the modified methods/types are exported from the root, but if you were deep importing them, the changes are as follows:
  - Change `getWorkspaceImplementationAndLockFile` to `getWorkspaceManagerAndRoot`, with return type `WorkspaceManagerAndRoot` (replacing `ImplementationAndLockFile`) to be more relevant for actual usage.
  - Remove `WorkspaceImplementations` type (use the identical existing type `WorkspaceManager` instead) (elcraig@microsoft.com)
- Rename `_resetCache` to `_resetPackageJsonFilesCache` to reflect what it does (elcraig@microsoft.com)

### Patches

- Add optional verbose logging for getWorkspaces helpers (elcraig@microsoft.com)
- Add more doc comments for getWorkspaces and related (elcraig@microsoft.com)
- Simplify workspace root utilities, and deprecate individual manager `get___WorkspaceRoot` utilities (use `getWorkspaceRoot` instead). This includes moving, deleting, or renaming certain private methods, but has no public-facing changes. (elcraig@microsoft.com)
- Minor fixes to new async workspace/package methods (elcraig@microsoft.com)

## 0.32.0

Thu, 06 Apr 2023 22:06:24 GMT

### Minor changes

- making the dep graph generation to be much faster (kchau@microsoft.com)

## 0.31.0

Thu, 06 Apr 2023 19:44:34 GMT

### Minor changes

- adding getPackageInfosAsync() to make that faster (kchau@microsoft.com)

## 0.30.0

Wed, 15 Feb 2023 01:42:19 GMT

### Minor changes

- Adds support for yarn 2+ (berry) (kchau@microsoft.com)

## 0.29.1

Thu, 17 Nov 2022 01:23:58 GMT

### Patches

- getRecentCommitMessages: return empty array if no commits (elcraig@microsoft.com)

## 0.29.0

Sat, 29 Oct 2022 16:33:47 GMT

### Minor changes

- added support for non-workspaces in getPackageInfos (ken@gizzar.com)

## 0.28.1

Tue, 20 Sep 2022 18:54:59 GMT

### Patches

- Add GIT_DEBUG environment variable (elcraig@microsoft.com)

## 0.28.0

Tue, 20 Sep 2022 08:01:43 GMT

### Minor changes

- Expose createDependencyMap (erenmurat@microsoft.com)

## 0.27.0

Fri, 16 Sep 2022 23:24:41 GMT

### Minor changes

- BREAKING CHANGE: `searchUp` now returns the full path to the item, not its parent directory. This only affects consumers that are directly using `searchUp`. (elcraig@microsoft.com)

## 0.26.6

Fri, 16 Sep 2022 23:00:36 GMT

### Patches

- Replace read-yaml-file with js-yaml (elcraig@microsoft.com)

## 0.26.5

Thu, 15 Sep 2022 23:30:21 GMT

### Patches

- Update dependency git-url-parse to v13 (email not defined)

## 0.26.4

Thu, 15 Sep 2022 08:01:32 GMT

### Patches

- Exclude test helpers from published package (elcraig@microsoft.com)

## 0.26.3

Fri, 12 Aug 2022 05:32:10 GMT

### Patches

- Fix listAllTrackedFiles if there are no tracked files' (elcraig@microsoft.com)

## 0.26.2

Fri, 12 Aug 2022 01:57:26 GMT

### Patches

- Add cleanup functions for addGitObserver (elcraig@microsoft.com)

## 0.26.1

Mon, 08 Aug 2022 22:44:02 GMT

### Patches

- Add missing type exports (elcraig@microsoft.com)

## 0.26.0

Thu, 04 Aug 2022 21:47:46 GMT

### Minor changes

- Use ES2019 output (compatible with Node 14) (elcraig@microsoft.com)

### Patches

- Gracefully handle not having a package.json at git root (boabdelm@microsoft.com)

## 0.25.4

Thu, 04 Aug 2022 08:01:48 GMT

### Patches

- Switch from multimatch to micromatch (elcraig@microsoft.com)

## 0.25.3

Wed, 03 Aug 2022 08:01:34 GMT

### Patches

- Simplify createPackageGraph and getPackageDependencies (elcraig@microsoft.com)
- Update find-up to v5 (elcraig@microsoft.com)

## 0.25.2

Tue, 02 Aug 2022 23:03:14 GMT

### Patches

- Add fs-extra to devDependencies and remove non-dev usage (elcraig@microsoft.com)

## 0.25.1

Thu, 21 Jul 2022 21:21:48 GMT

### Patches

- Use git ls-files for checkUntrackedFiles (dannyfritz@gmail.com)

## 0.25.0

Thu, 21 Jul 2022 21:11:11 GMT

### Minor changes

- BREAKING CHANGE: Improve detection of git root and throw if not found (dlannoye@microsoft.com)

## 0.24.0

Wed, 20 Jul 2022 22:31:31 GMT

### Minor changes

- Make getDefaultRemote properly handle more combinations of URL formats, and add more logging to encourage defining the `repository` property in package.json for more accurate detection (elcraig@microsoft.com)

## 0.23.3

Fri, 15 Jul 2022 07:09:50 GMT

### Patches

- change the api to be restored to have getDependentMap (actually gets  dependencies) (ken@gizzar.com)

## 0.23.2

Fri, 15 Jul 2022 05:05:48 GMT

### Patches

- fixing the dependent map results (ken@gizzar.com)

## 0.23.1

Fri, 15 Jul 2022 03:59:39 GMT

### Patches

- fixing the missing getDependentMap API that lage uses (ken@gizzar.com)

## 0.23.0

Thu, 14 Jul 2022 17:22:35 GMT

### Minor changes

- refactoring and cleaning up the createPackageGraph API to make it not repeat edges (kchau@microsoft.com)

## 0.22.0

Wed, 13 Jul 2022 20:42:07 GMT

### Minor changes

- Update git-url-parse (includes [possible breaking changes](https://github.com/IonicaBizau/git-url-parse/releases/tag/12.0.0)) (elcraig@microsoft.com)

### Patches

- Remove unneeded files from published package (elcraig@microsoft.com)

## 0.21.0

Fri, 01 Jul 2022 14:56:01 GMT

### Minor changes

- adds a package graph implementation (ken@gizzar.com)

## 0.20.0

Thu, 23 Jun 2022 20:24:15 GMT

### Minor changes

- BREAKING: Remove getChangePath because it's specific to beachball and should be defined there (elcraig@microsoft.com)

## 0.19.4

Thu, 23 Jun 2022 19:53:03 GMT

### Patches

- Add findProjectRoot path helper (elcraig@microsoft.com)

## 0.19.3

Thu, 23 Jun 2022 19:10:04 GMT

### Patches

- Move typedoc to devDependencies (elcraig@microsoft.com)

## 0.19.2

Thu, 23 Jun 2022 18:52:05 GMT

### Patches

- Allow full spawnSync options for git methods (elcraig@microsoft.com)

## 0.19.1

Fri, 03 Jun 2022 16:57:07 GMT

### Patches

- properly split git status --short output (nickykalu@microsoft.com)

## 0.19.0

Thu, 05 May 2022 19:40:25 GMT

### Minor changes

- adds a new API to allow retrieving a list of packages affected by files and also by git ref range (kchau@microsoft.com)

## 0.18.4

Wed, 20 Apr 2022 16:49:02 GMT

### Patches

- fixes a potential security issue where fetch --upload-pack can allow for command injection (kchau@microsoft.com)

## 0.18.3

Sat, 09 Apr 2022 15:51:14 GMT

### Patches

- Fix Rush not being detected correctly. When Rush is set up to use Yarn or pnpm, the lock file for the latter are found first. (4123478+tido64@users.noreply.github.com)

## 0.18.2

Fri, 07 Jan 2022 18:15:36 GMT

### Patches

- Makes the output of parseLockFile for npm v7+ lock file compatible with queryLockFile. (riacarmin@microsoft.com)

## 0.18.1

Fri, 07 Jan 2022 17:07:22 GMT

### Patches

- bump ts to 4.5 and fixed typing issues with caught errors as unknown (kchau@microsoft.com)

## 0.18.0

Fri, 07 Jan 2022 00:04:32 GMT

### Minor changes

- speed up workspace-tools - reducing weight and adding caches - lazy load pkg mgr helpers (kchau@microsoft.com)

## 0.17.0

Thu, 02 Dec 2021 17:11:12 GMT

### Minor changes

- Implements NPM workspaces support to parseLockFile utility. (riacarmin@microsoft.com)

## 0.16.2

Thu, 03 Jun 2021 20:23:22 GMT

### Patches

- get the right default remote branch (kchau@microsoft.com)

## 0.16.1

Thu, 27 May 2021 20:04:05 GMT

### Patches

- getting rid of console logs from the library (kchau@microsoft.com)

## 0.16.0

Tue, 25 May 2021 21:47:27 GMT

### Minor changes

- Fix #24: Add support for different upstream branches (dannyvv@microsoft.com)

## 0.15.1

Wed, 19 May 2021 21:05:10 GMT

### Patches

- slimming down pnpm lockfile parsing (kchau@microsoft.com)

## 0.15.0

Fri, 23 Apr 2021 23:35:26 GMT

### Minor changes

- fixes the checkchange command; support lerna (previous checkin) (kchau@microsoft.com)

## 0.14.1

Fri, 23 Apr 2021 23:03:54 GMT

### Patches

- move lockfile implementations behind a lazy load in lockfile.ts (kchau@microsoft.com)

## 0.14.0

Mon, 12 Apr 2021 16:25:24 GMT

### Minor changes

- feat: Only include HEAD commits in 'recent commits' (asgramme@microsoft.com)

## 0.13.0

Mon, 12 Apr 2021 05:59:38 GMT

### Minor changes

- Add support for more commit command options (nickykalu@microsoft.com)

## 0.12.3

Tue, 23 Feb 2021 20:08:54 GMT

### Patches

- fixing up the rush package detection code (kchau@microsoft.com)

## 0.12.2

Tue, 16 Feb 2021 23:49:29 GMT

### Patches

- fetchRemote() fix to be more specific if branch is provided (kchau@microsoft.com)

## 0.12.1

Tue, 16 Feb 2021 23:13:38 GMT

### Patches

- adding back the maxbuffer options to git - got lost in translation (kchau@microsoft.com)

## 0.12.0

Tue, 16 Feb 2021 22:41:15 GMT

### Minor changes

- adding missing git functions into workspace-tools from beachball repo (kchau@microsoft.com)

## 0.11.0

Wed, 27 Jan 2021 20:58:49 GMT

### Minor changes

- Adding NPM 7 Workspaces implementation. (fecamina@microsoft.com)

## 0.10.3

Tue, 26 Jan 2021 09:28:35 GMT

### Patches

- fix: Detect changed package(s) in nested monorepo (oliver.kuruma@gmail.com)

## 0.10.2

Mon, 30 Nov 2020 18:53:38 GMT

### Patches

- Allow a much bigger buffer for getting changed packages (kchau@microsoft.com)

## 0.10.1

Mon, 19 Oct 2020 20:24:42 GMT

### Patches

- replaced matcher with multimatch (kchau@microsoft.com)

## 0.10.0

Mon, 12 Oct 2020 16:27:40 GMT

### Minor changes

- Introduce getWorkspaceRoot() (bewegger@microsoft.com)

## 0.9.8

Tue, 15 Sep 2020 17:45:13 GMT

### Patches

- added repository information in package.json (david@lannoye.net)

## 0.9.7

Tue, 15 Sep 2020 17:40:30 GMT

### Patches

- support scoped package matches to match regardless of scopes (kchau@microsoft.com)

## 0.9.6

Thu, 10 Sep 2020 23:43:54 GMT

### Patches

- no more requires (kchau@microsoft.com)

## 0.9.5

Thu, 10 Sep 2020 23:36:23 GMT

### Patches

- do not do dynamic require (kchau@microsoft.com)

## 0.9.4

Mon, 31 Aug 2020 23:19:25 GMT

### Patches

- add extended-info to getPackageInfos (kchau@microsoft.com)

## 0.9.3

Wed, 19 Aug 2020 23:27:31 GMT

### Patches

- fixes the case where deps with no dependencies are not added the edges in the subgraph calculation (kchau@microsoft.com)

## 0.9.2

Wed, 19 Aug 2020 22:44:02 GMT

### Patches

- adding subgraph support get transitive consumer (kchau@microsoft.com)

## 0.9.1

Sun, 09 Aug 2020 03:46:17 GMT

### Patches

- handle nested change detection (kchau@microsoft.com)

## 0.9.0

Fri, 17 Jul 2020 19:16:04 GMT

### Minor changes

- Add a new env variable to allow one to pick the preferred workspace manager (kchau@microsoft.com)

## 0.8.0

Fri, 19 Jun 2020 17:53:56 GMT

### Minor changes

- adding getTransitiveProviders and renamed getTransitiveDependencies to getTransitiveConsumers (kchau@microsoft.com)

## 0.7.6

Tue, 26 May 2020 16:55:44 GMT

### Patches

- fixes an issue with globby so that workspaces matches are found correctly (kchau@microsoft.com)

## 0.7.5

Mon, 25 May 2020 18:15:11 GMT

### Patches

- speeding up getRushWorkspaces by skipping the slow rush config reader by a simple json reader (kchau@microsoft.com)

## 0.7.4

Sat, 23 May 2020 22:54:25 GMT

### Patches

- adding unstaged changes in the changed packges (kchau@microsoft.com)

## 0.7.3

Sat, 23 May 2020 19:57:45 GMT

### Patches

- Adding a getChangedPackages() function (#1) (kchau@microsoft.com)

## 0.4.0

Fri, 15 May 2020 18:10:15 GMT

### Minor changes

- Integrating additional workspace utilities from the backfill package (kchau@microsoft.com)

## 0.3.3

Wed, 13 May 2020 00:54:54 GMT

### Patches

- Merge branch 'master' of https://github.com/kenotron/workspace-tools (kchau@microsoft.com)

## 0.3.2

Wed, 13 May 2020 00:52:56 GMT

### Patches

- using matcher instead of multimatch for the scope (kchau@microsoft.com)

## 0.3.1

Tue, 12 May 2020 16:43:14 GMT

### Patches

- expose depedent map (kchau@microsoft.com)

## 0.3.0

Tue, 12 May 2020 01:25:52 GMT

### Minor changes

- includes the scoped packages functions (kchau@microsoft.com)

## 0.2.1

Tue, 12 May 2020 01:00:31 GMT

### Patches

- fix the typing pointer (kchau@microsoft.com)

## 0.2.0

Tue, 12 May 2020 00:58:34 GMT

### Minor changes

- adds declaration (kchau@microsoft.com)

## 0.1.1

Tue, 12 May 2020 00:55:50 GMT

### Patches

- caching graph (kchau@microsoft.com)
