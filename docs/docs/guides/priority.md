---
sidebar_position: 7

title: Priorities
---

In a large monorepo, you'll need to do some [profiling](./profile.md) to understand bottlenecks. Sometimes, the package tasks are not scheduled in the order that will produce the most optimized run times.

Lage provides the following options to customize the task priority. The higher the priority number, the higher the priority. These numbers are relative to each other. Any task that is not listed in the priorities array is not prioritized.

## Configuration

As of `lage` v2, you can now configure the priority inside the target pipeline configuration:

```js
/** @type {import("lage").ConfigFileOptions} */
const config = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
    "foo#test": {
      priority: 100,
      dependsOn: ["build"]
    }
  }
};
module.exports = config;
```

## Legacy (v1 + v2) configuration

To manually pick a package task to be higher priority, simply add a [`priorities` configuration](../reference/config.md) in `lage.config.js`:

```js
/** @type {import("lage").ConfigFileOptions} */
const config = {
  priorities: [
    {
      package: "foo",
      task: "test",
      priority: 100
    }
  ]
};
module.exports = config;
```
