# workspace-tools

A collection of utilities that are useful in a git-controlled monorepo managed by one of these tools:

- lerna
- bun workspaces
- npm workspaces
- pnpm workspaces
- rush
- yarn workspaces

## Environment variables

### GIT_DEBUG

Set to any value to log output for all git commands.

### GIT_MAX_BUFFER

Override the `maxBuffer` value for git processes, for example if the repo is very large. `workspace-tools` uses 500MB by default.

### PREFERRED_WORKSPACE_MANAGER

Sometimes if multiple workspace/monorepo manager files are checked in, it's necessary to hint which manager is used: `bun`, `npm`, `yarn`, `pnpm`, `rush`, or `lerna`. Some APIs also accept a `manager` parameter, which is now the preferred method when available.

### VERBOSE

Log additional output from certain functions.

## Breaking changes

For details of changes in all versions, see the [changelog](https://github.com/microsoft/lage/blob/main/packages/workspace-tools/CHANGELOG.md). This only lists the most significant breaking API changes.

### 0.41.0

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
