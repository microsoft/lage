---
sidebar_position: 1
sidebar_label: Introduction
sidebar_class_name: green
slug: Introduction
---

When your JavaScript repository has grown large enough that you have turned to using a [monorepo](https://monorepo.tools) to help you organize your code as multiple packages inside a repository. That's great! However, you realized quickly that the build scripts defined inside the workspace have to be run in package dependency order.

There exists tools in the market that will provide a way for you to run these npm scripts in a topological order. These tools will allow you execute your tasks in the correct order. So why choose `lage` for your repository? 

1. `lage` is battle tested - it is in use by many JavaScript repositories number in the millions lines of code each
2. `lage` can be easily adopted - all it takes is just one npm package install with a single configuration file for the entire repository
3. `lage` supports remote cache as a fallback - never build the same code twice
4. `lage` is optimized for modern multi-core development machines - don't waste your CPU resource waiting on a single core when you have so many to spare!

## How does `lage` figure out how to schedule tasks?

`lage` has a secret weapon: it has a "pipeline" configuration syntax to define the implicit relationship between tasks. Combined with a package graph, `lage` knows how to schedule which task to run first and which one can be run in parallel. Let's look at an example:

### A hypothetical example

1. Take a package graph

![Package graph](/img/package-graph.png)

2. Combine it with a task graph:

![Task graph](/img/task-graph.png)

3. `lage` generates a "target graph"

![Target graph](/img/target-graph.png)

## Quick Start

`lage` gives you this capability with very little configuration. First, let's install the `lage` utility. You can place this in your workspace's root `package.json` by running `yarn add`:

```
yarn add -D lage
```

Confirm with `yarn` that you are sure to add a package at the root level, you then place a root level script inside the `package.json` to run `lage`:

```
{
  "scripts": {
    "build": "lage build",
    "test": "lage test"
  }
}
```

Add a configuration file in the root to get started. Create this file at the root `lage.config.js`:

```js
module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
  },
};
```

Do not worry about the syntax for now. We will go over the configuration file in a coming section. You can now run this command:

```
$ lage test
```

`lage` will detect that you need to run `build` steps before `test`s are run.



# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
