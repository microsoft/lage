# @lage-run/target-graph

This package is concerned about the target graph. The target is a unit of work that gets spawned in a child process eventually be a scheduler + target runner. The main focus of this package are:

1. `Target` interface.
2. converter that changes from target ID to package + task, and vice versa.
3. A simple `TargetGraphBuilder` that handles prioritization, cycle detection, subgraph generation.
4. A workspace-aware `WorkspaceTargetGraphBuilder` that will take in `PackageInfos` object with some task (dependency) configuration and builds a direct-acyclic graph of the targets.
5. A `TargetFactory` that can generate "global" or "package" level `Target`s.

## WorkspaceTargetGraphBuilder usage

For the case (the typical `lage` CLI case) where we want to use the shorthand syntax to specify a task graph combining with a package dependency graph, this is the right Builder implementation.

```typescript
import { WorkspaceTargetGraphBuilder } from "@lage-run/target-graph";
import { findProjectRoot, getPackageInfos } from "workspace-tools";

const rootDir = findProjectRoot(process.cwd());
const packageInfos = getPackageInfos(rootDir);

const builder = new WorkspaceTargetGraphBuilder(rootDir, packageInfos);

const tasks = ["build", "test"];
const packages = ["package-a", "package-b"];

builder.addTargetConfig("build", {
  dependsOn: ["^build"],
});

const targetGraph = builder.build(tasks, packages);
```

## TargetGraphBuilder usage

```typescript
const builder = new TargetGraphBuilder();

const target1 = {...};
const target2 = {...};
const target3 = {...};

builder.addTarget(target1);
builder.addTarget(target2);
builder.addTarget(target3);

builder.addDependency(target1.id, target2.id);

const graph = builder.build();
```

The resultant `targetGraph` will have a signature of this shape:

```typescript
interface TargetGraph {
  targets: Map<string, Target>;
  dependencies: [string, string][];
}
```

### TargetFactory usage

```typescript
const root = "/some/repo/root";
const resolver = (packageName: string) => {
  return `packages/${packageName}`;
};

const factory = new TargetFactory({ root, resolver });

const target = factory.createPackageTarget("a", "build", {
  ... // `TargetConfig`
});
```

### `Target`

This is merely an interface that contains enough information to let the runner & scheduler know what to run. The "how" of how to run a target resides in the scheduler and a separate runner implementation.
