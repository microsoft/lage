---
sidebar_position: 2

title: Pipelines
---

In this step, you'll learn about how to influence how `lage` schedules which "target" runs at which time. For full details on how to configure pipelines, make sure to consult with the [reference for configuration](../reference/config).

## What is a `lage` pipeline?

In the traditional monorepo task runners, each npm lifecycle script like `build` or `test` is run topologically or in parallel individually. Depending on the graph of the packages, CPU cores are left idle, wasting developer time.

Futhermore, the developer is expected to keep track of an **implicit** graph of the tasks. For example, the developer is expected to understand that perhaps the `test` task is only available after `build` has completed.

`lage` gives developers a way to specify these relationships **explicitly**. The advantage here is twofold:

- `lage` can use this explicit declaration to perform an optimized build based on the abundant availability of multi-core processors.
- Incoming developers can look at `lage.config.js` and understand how tasks are related.

## Defining a pipeline

To define the task dependency graph, use the `pipeline` key in `lage.config.js`. For example, this is the default generated configuration when you run `npx lage init`:

```js title="/lage.config.js"
module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
    lint: []
  }
};
```

Each key is a **task name**, and each value is an array of **task dependencies** (or an [advanced configuration](#advanced-pipeline-configuration) object).

Usually, a task name corresponds to a `scripts` entry in package-level `package.json` files: e.g. `build`, `test`, `lint`. If the script name doesn't exist for a particular package, it's skipped. (There are also [advanced task types](#advanced-task-types).)

A task can depend on zero or more other tasks. The special characters `^`, `^^`, and `#` are used to indicate dependency types (see below for details).

### Empty dependency list

A task with no dependencies will start whenever a worker is available. Unless a [priority](./priority) is specified, there's no guarantee of ordering by package or relative to other tasks.

```js
module.exports = {
  pipeline: {
    lint: []
  }
};
```

### Same-package dependency

A dependency name with **no special characters** means depend on this task from the _same package_ only. There's no direct guarantee about the ordering of packages.

In the example below, `lage test` will ensure each package's `build` task completes before running its `test` task. (Since `build` has no dependencies in this example, each package's `build`+`test` sequence could run in any order relative to the other packages.)

```js
module.exports = {
  pipeline: {
    build: [],
    test: ["build"]
  }
};
```

### `^` Direct topological dependency

`^task` means the task has a package-topological dependency: it must run in topological order based on the package dependency graph.

For the example below, suppose package `foo` depends on package `bar`. `lage build` guarantees that `bar`'s `build` task will complete before `foo`'s `build` task starts.

```js
module.exports = {
  pipeline: {
    build: ["^build"]
  }
};
```

### `^^` Transitive topological dependency

`^^task` means the task must be run in topological order for all nested dependencies of the current package.

Note that the task will **NOT** be run for the current package unless you also include that variant in the dependencies list: e.g. `["^^task", "task"]`.

In the example below, suppose package `foo` depends on `bar` which depends on `baz`, and _only_ `foo` has a `bundle` task. `lage bundle` will run the following:

1. `baz`'s `transpile` task
2. `bar`'s `transpile` task
3. `foo`'s `bundle` task (but NOT its `transpile` task if present)

```js
module.exports = {
  pipeline: {
    bundle: ["^^transpile"],
    transpile: []
  }
};
```

To run `foo`'s `transpile` task, the configuration would need to be updated with `bundle: ["^^transpile", "transpile"]`.

If `bar` or `baz` also had a `bundle` task, note that the configuration above provides no guarantee of `bundle` task ordering. If that order _did_ matter, you'd need to use `bundle: ["^bundle", "^^transpile"]`.

### Specific package tasks

Sometimes a specific package may depend on a task from another specific package. This can occur especially in repos that are just coming off of lerna or rush where the tasks are traditionally run in separate phases. Sometimes assumptions were made that cannot be expressed in the simple task pipeline configuration as seen above. These dependencies can be specified in the pipeline config as follows.

In this example, a `build` script of `foo` package depends on the `test` script of `bar`. The syntax is `package#task`.

```js
module.exports = {
  pipeline: {
    test: ["build"],
    // foo build depends on the output of bar test
    "foo#build": ["bar#test"]
  }
};
```

This seems like it goes against `test: ["build"]`, but it does not. Since `test` scripts does not have a topological dependency, they can theoretically be triggered whenever that package's `build` script has finished!

The general guidance is to get rid of these specific package-task to package-task dependencies in the pipeline as quickly as possible so the builds can be optimized better.

## Advanced pipeline configuration

Optionally, you can use an object for advanced pipeline task target configuration, such as priority, weight, inputs and outputs for caching, worker count limits, custom conditions, and custom worker configuration.

See the [`TargetConfig` source](https://github.com/microsoft/lage/blob/master/packages/target-graph/src/types/TargetConfig.ts) for full details. There are also some examples in [lage's own config](https://github.com/microsoft/lage/blob/master/lage.config.js).

```js
/** @type {import("lage").ConfigOptions} */
const config = {
  pipeline: {
    build: {
      type: "npmScript", // this is the default
      dependsOn: ["^build"], // replaces the dependency array syntax
      priority: 1,
      weight: 10,
      outputs: ["dist/**", "lib/**"],
      inputs: ["src/**", "package.json", "tsconfig.json"]
    }
  }
};
module.exports = config;
```

## Advanced task types

For most tasks, the default type of `"npmScript"` is sufficient. However, there are some other types available. There are also options for each type.

### npm script tasks

By default, tasks have `type: "npmScript"`, meaning they correspond to a script in `package.json` for at least one package.

Usually, the only reason you'd need to explicitly specify this type is

```js
/** @type {import("lage").ConfigOptions} */
const config = {
  pipeline: {
    // "transpile" is a worker task for most packages
    transpile: {
      type: "worker"
      // ... see below for an example of worker options
    },
    // For package foo, change "transpile" back to a normal npmScript task
    "foo#transpile": {
      type: "npmScript"
    },
    // For package bar, run a different npm script instead of "transpile"
    "bar#transpile": {
      type: "npmScript",
      options: {
        script: "build"
      }
    }
  }
};
module.exports = config;
```

### No-op tasks

A task can be configured with `type: "noop"` to indicate that it does not correspond to any actual script in the package's `package.json` file. This is useful for grouping other tasks together, or is one way to disable a task for a specific package.

This example (modified from lage's own configuration) defines a `build` "meta-task" that depends the `transpile` and `types` tasks which correspond , but does not correspond to any actual script in the packages.

```js
/** @type {import("lage").ConfigOptions} */
const config = {
  pipeline: {
    transpile: [],
    types: ["^types"],
    build: {
      type: "noop",
      dependsOn: ["transpile", "types"]
    }
  }
};
module.exports = config;
```

### Worker tasks

There are also some examples in the [cookbook section](../cookbook/make-jest-fast) and [lage's own config](https://github.com/microsoft/lage/blob/master/lage.config.js).
