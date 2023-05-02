---
sidebar_position: 7

title: 7. Priorities
---

In a large monorepo, you'll need to do some [profiling](./profile.md) to understand bottlenecks. Sometimes, the package tasks are not scheduled in the order that will produce the most optimized run times.

## v2 styled configuration for priority

As of `lage` v2, you can now configure the priority inside the target pipeline configuration:

```js
module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
    "foo#test": {
      priority: 100,
      dependsOn: ["build"]
    }
  }
};
```

## Legacy (v1 + v2) way of configuring priority

To manually pick a package task to be higher priority, simply place a [`priorities` configuration](../Reference/config.md) in the `lage.config.js`:

```js
module.exports = {
  pipeline: { ... },
  priorities: [
    {
      package: 'foo',
      task: 'test',
      priority: 100
    }
  ]
}
```

The higher the priority number, the higher the priority. These numbers are relative to each other. Any task that is not listed in the priorities array is not prioritized.
