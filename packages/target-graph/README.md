# @lage-run/target-graph

This package is concerned about the target graph. The target is a unit of work that gets spawned in a child process eventually be a scheduler + target runner. The main focus of this package are:

1. Target interface
2. converter that changes from target ID to package + task, and vice versa
3. A `TargetGraphBuilder` that will take in `PackageInfos` object with some task (dependency) configuration and builds a direct-acyclic graph of the targets.

## TargetGraphBuilder usage

```typescript
const rootDir = getWorkspaceRoot(process.cwd());
const packageInfos = getPackageInfos(rootDir);

const builder = new TargetGraphBuilder(rootDir, packageInfos);

const tasks = ["build", "test"];
const packages = ["package-a", "package-b"];

const targetGraph = builder.buildTargetGraph(tasks, packages);
```

The resultant `targetGraph` will have a signature of this shape:

```typescript
interface TargetGraph {
  targets: Map<string, Target>;
  dependencies: [string, string][];
}
```

### `Target`

This is merely an interface that contains enough information to let the runner & scheduler know what to run. The "how" of how to run a target resides in the scheduler and a separate runner implementation.