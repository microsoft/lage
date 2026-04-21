This fixture is intended to match the other `monorepo-basic-*` fixtures (bun):

- Workspaces: `["packages/*", "individual"]`
- Same basic dependencies at root
- `package-a` depends on `react` and `react-dom` (to introduce a `peerDependency`)
