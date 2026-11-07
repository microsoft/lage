This fixture is intended to match the other `monorepo-basic-*` fixtures:

- Workspaces: `["individual", "packages/*"]`
- Same basic dependencies at root
- `package-a` depends on `react` and `react-dom` (to introduce a `peerDependency`)

It additionally has one pnpm-specific dependency that the sibling `monorepo-basic-*` fixtures omit:

- `package-a` depends on `package-b` via `workspace:^` (to introduce a `link:../package-b` workspace
  reference in the lockfile `importers`, which `parsePnpmLock` must preserve verbatim). `link:` is a
  pnpm-lockfile concept, so this edge is only meaningful for the pnpm fixture.

It should use the latest version of `pnpm` (may require changing to a newer Node version if updating the lock file). There should only be one `monorepo-basic-pnpm` fixture unless the way workspaces are specified changes. Lock file changes for different versions of `pnpm` should have separate fixtures.

`pnpm` version to `lockfileVersion` mapping: https://github.com/pnpm/spec/blob/master/lockfile/README.md
