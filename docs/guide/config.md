---
title: Configuration
---

Configuration is provided by [Cosmiconfig](https://www.npmjs.com/package/cosmiconfig), so `lage` configuration is very flexible! We recommend the use of a `lage.config.js` because it is both concise and flexible.

Create a `lage.config.js` file and place all your configurations there:

```js
module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
  },
};
```

## Options

`pipeline`

```ts
interface Pipeline {
  [task: string]: string[];
}
```

This is a terse way to specify a dependency graph of npm scripts. To say `test` script depends on `build` within the **same package**, you can put this in the pipeline:

```js
module.exports = {
  pipeline: {
    build: [],
    test: ["build"],
  },
};
```

The above says that `build` does not depend on anything. `test` script will only be run in the package if `build` has run. To specify that `build` depends the `build` of the package transitive dependencies, you have the use the `^` symbol like this:

```js
module.exports = {
  pipeline: {
    build: ["^build"],
  },
};
```

In this case, when you run the `build` script, `lage` will make sure the dependencies' `build` are run first. A more complex example is this:

```js
module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
    bundle: ["build"],
    integration: ["bundle"],
  },
};
```

`priorities`

```typescript
export type Priority = { package: string; task: string; priority: number };
```

The configuration enables for tasks to be given priorities. These priorities enable the task runner to schedule tasks with a higher priority sooner than tasks with a lower priority. An example use case would be to give tasks that take a long time to execute a high priority so that these tasks (and the tasks these tasks depend on) can be scheduled earlier to reduce overall execution time.

```js
module.exports = {
 priorities: [{ package: "build-tools"; task: "build"; priority: 20 }]
}
```
