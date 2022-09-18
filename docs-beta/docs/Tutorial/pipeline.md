---
sidebar_position: 2

title: 2. Pipeline
---

In this step, you'll learn about how to influence how `lage` schedules which "target" runs at which time. For full details on how to configure pipelines, make sure to consult with the [reference for configuration](/docs/Reference/config).

## What is a `lage` pipeline?

In the traditional monorepo task runners, each npm lifecycle script like `build` or `test` is run topologically or in parallel individually. Depending on the graph of the packages, CPU cores are left idle wasting developer time.

Futhermore, the developer is expected to keep track of an **implicit** graph of the tasks. For example, the developer is expected to understand that perhaps the `test` task is only available after `build` has completed.

`lage` gives developers a way to specify these relationships **explicitly**. The advantage here are two fold. First, incoming new developers can look at `lage.config.js` and understand how tasks are related. Second, `lage` can use this explicit declaration to perform an optimized build based on the abundant availability of multi-core processors.

## Defining a pipeline

To define the task dependency graph, use the `pipeline` key in the `lage.config.js`. For example, this is the default generated configuration when you run `npx lage init`:

```js
module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
    lint: [],
  },
};
```

### Task dependency format

What you are declaring here in the `pipeline` object of the configuration is a dependency graph of tasks. The `test` task above depends on the `build` task of the same package. The dependencies of `test` is an array, so it actually can depend on multiple tasks. This may be more relevant in a more complex monorepo.

### Topological dependency

The `^` symbol explicitly declares that the task has a package-topological dependency on another task. For example, if `foo` package depends on `bar`, `lage build` will guarantee that the `build` task of `bar` will happen before `foo`'s `build` task.

```json
{
  "pipeline": {
    "build": ["^build"]
  }
}
```

### Empty dependency list

The `lint` task above has NO dependencies. This means that it can start whenever it can!

```json
{
  "pipeline": {
    "lint": []
  }
}
```

### Tasks that are in the `pipeline` but not in SOME `package.json`

Sometimes tasks declared in the `pipeline` are not present in all packages' `package.json` files. `lage` will automatically ignore those. No problem!

### Specific package tasks

Sometimes it becomes necessary to manually place a package task dependency on another package task. This can occur especially in repos that are just coming off of a lerna or rush repository where the tasks are traditionally run in separate phases. Sometimes assumptions were made in those repositories that are not expressable in the simple task pipeline configuration as seen above. For thoes cases, simply place those alongside with the rest of the pipeline configuration.

In this example, we illustrate a `build` script of `foo` package depends on the `test` script of `bar`. The syntax is `[package]#[task]`.


```json
// package-a build depends on the output of package-b build.
{
  "pipeline": {
    "test": ["build"],
    "foo#build": ["bar#test"]
  }
}
```

This seems like it goes against the `test: ["build"]`, but it does not. Since `test` scripts does not have a topological dependency, it theoretically can get triggered anytime its own package's `build` script has finished! The general guidance is to get rid of these specific package-task to package-task dependency in the pipeline as quickly as possible so the builds can be optimized better.
