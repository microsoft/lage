# @lage-run/scheduler

This package provides:

1. `Scheduler` interface
2. `
3. a default cache provider that uses `backfill`

## Usage

```ts
import { Logger } from "@lage-run/logger";
import { RemoteFallbackCacheProvider, TargetHasher } from "@lage-run/cache";
import { SimpleScheduler } from "@lage-run/scheduler";
import { TargetGraph } from "@lage-run/target-graph";

const root = "/root-of-repo";
const logger = new Logger();
const cacheProvider = new RemoteFallbackCacheProvider({ root, logger, ... });
const hasher = new TargetHasher({ root, ... });

const runner = new NpmScriptRunner({
  logger,
  ...
})

const scheduler = new SimpleScheduler({
  logger,
  concurrency,
  cacheProvider,
  hasher,
  continueOnError: true,
  shouldCache: true,
  shouldResetCache: false,
});

const targetGraphBuilder = new TargetGraphBuilder();
const packageInfos = getPackageInfos(rootDir);

const builder = new TargetGraphBuilder(rootDir, packageInfos);

// these would normally come from the CLI
const tasks = ["build", "test"];
const packages = ["package-a", "package-b"];

const targetGraph = builder.buildTargetGraph(tasks, packages);

await scheduler.run(root, targetGraph);

// If an error happened...
scheduler.abort();
```
