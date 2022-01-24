---
sidebar_position: 8

title: Priorities
---

# Priorities

As your repo gets more and more complex, you'll need to do some some [profiling](./profile) to understand bottlenecks. Sometimes, the package tasks are not queued in the order that will produce the most optimized run times.

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

> Note: an active research here is how to provide `lage` historical data to automatically prioritize in subsequent runs. PR's are welcome!
