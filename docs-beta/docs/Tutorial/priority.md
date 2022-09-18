---
sidebar_position: 7

title: 7. Priorities
---

In a large monorepo, you'll need to do some [profiling](./profile) to understand bottlenecks. Sometimes, the package tasks are not scheduled in the order that will produce the most optimized run times.

To manually pick a package task to be higher priority, simply place a [`priorities` configuration](./Config) in the `lage.config.js`:

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

The higher the priority number, the higher the priority. These numbers are relative with each other. Anything that is not listed in the priorities array means they are not prioritized.
