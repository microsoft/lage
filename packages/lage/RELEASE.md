# Release v2.0.0

Lage version 2 is now available at dist-tag `@latest`, featuring significant updates and improvements that make this release truly unique:

- Brand new UI! Easier on the eyes for local interactive view of work done by workers
- Built-in lighter weight, flexible multi-threading model with a worker pool
- New `worker` target type that can enable multi-core for various tools like TypeScript and ESLint
- Dedicate maximum workers to certain tasks, allowing better utilization of resources
- Customizable CLI argument to be passed along to the `npm script` runner
- Weighted targets to allow better utilization of resources for tasks that spawn multiple processes like Jest
- Smaller installation, faster startup times thanks to distributing a pre-made bundle rather than individual scripts
- Featured in v1, but expanded in v2: the configuration syntax of pipelines is improved to allow for more [configuration options](https://microsoft.github.io/lage/docs/Reference/config#a-complete-tour-of-the-config)
- Remote fallback cache to speed up local development experience
- `@lage-run` scoped packages are now available to integrate as a set of Node.js API such as target graphs, scheduling, worker pool, logging, caching, etc.

## Breaking changes

- `lage` requires **Node 16**, or using the `--experimental-abortcontroller` flag in Node 14
- `lage` now will automatically write remote cache if the typical environment variable is set (e.g. `CI` or `TF_BUILD`)
- `info` command is not implemented yet
- `graph` command is not implemented yet

## Other features and migration

[See the migration guide on the website.](https://microsoft.github.io/lage/docs/Cookbook/migration)

## New Node.js API @lage-run scoped packages

- `@lage-run/cache`: `backfill` based cache layer that adds the capability of remote fallback (from a cloud storage, such as Azure Blob Storage)
- `@lage-run/find-npm-client`: finds the right npm binary (Windows, macOS, and Linux compatible)
- `@lage-run/format-hrtime`: calculates diffs and formats high-resolution time as given by `process.hrtime()`
- `@lage-run/haser`: a high performance repo-wide source code hasher
- `@lage-run/logger`: generic library that logs structured data to various `reporters`
- `@lage-run/reporters`: actually outputs the log stream to some format like JSON, Chromium Traces, and even the new interactive lage UI
- `@lage-run/scheduler`: a typed work scheduler that understands how to schedule work according to a `target-graph`
- `@lage-run/target-graph`: a graph representation between of packages and their tasks; with utilities to caculate subgraphs
- `@lage-run/worker-threads-pool`: a typed `worker_threads` pool implementation that includes the ability to associate stdout of each task given to workers
