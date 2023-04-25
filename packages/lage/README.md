# lage

Documentation: https://microsoft.github.io/lage/

See the [release notes](https://github.com/microsoft/lage/blob/master/packages/lage/RELEASE.md) for more details of new features!

## Overview

Your JS repo has gotten large enough that you have turned to using a tool to help you manage multiple packages inside a repository. That's great! However, you realized quickly that the tasks defined inside the workspace have to be run in package dependency order.

Lerna, Rush, wsrun and even pnpm will provide a simple way for you to run npm scripts to be run in a topological order. However, these tools will force you to run your tasks by script name one at a time. For example, all the `build` scripts will have to run first. Then all the `test` scripts run in the topological order.

This usually means that there are wasted CPU cycles in between `build` and `test`. We can achieve better pipelining the npm scripts if we had a way to say that `test` can run as soon as `build` are done for the package.

`lage` (Norwegian for "make", pronounced law-geh) solves this by providing a terse pipelining syntax. It has many features geared towards speeding up the task runner that we'll explore later.

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
