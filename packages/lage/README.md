# lage

Documentation: https://microsoft.github.io/lage/

**Lage v2 is here!** See the [release notes](https://github.com/microsoft/lage/blob/master/packages/lage/RELEASE.md) for details about new features and breaking changes.

## Overview

Your JS repo has gotten large enough that you have turned to using a tool to help you manage multiple packages inside a repository. That's great! However, you realized quickly that the tasks defined inside the workspace have to be run in package dependency order.

Lerna, Rush, wsrun and even pnpm will provide a simple way for you to run npm scripts to be run in a topological order. However, these tools will force you to run your tasks by script name one at a time. For example, all the `build` scripts will have to run first. Then all the `test` scripts run in the topological order.

This usually means that there are wasted CPU cycles in between `build` and `test`. We can achieve better pipelining the npm scripts if we had a way to say that `test` can run as soon as `build` are done for the package.

`lage` (Norwegian for "make", pronounced law-geh) solves this by providing a terse pipelining syntax. It has many features geared towards speeding up the task runner that we'll explore later.

## Quick start

`lage` gives you this capability with very little configuration.

### Automatic installation

You can automatically install lage and create a basic config file by running:

```
npx lage init
```

### Manual installation

You can also install and configure `lage` manually.

First, install `lage` at your workspace's root. For example, if you're using `yarn`:

```
yarn add -D -W lage
```

Next, add scripts inside the workspace root `package.json` to run `lage`. For example:

```json
{
  "scripts": {
    "build": "lage build",
    "test": "lage test"
  }
}
```

To specify that `test` depends on `build`, create a file `lage.config.js` at the repo root and add the following. Also fill in the required `cacheOptions`.

```js
/** @type {import("lage").ConfigFileOptions} */
const config = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
  },
  // Update these according to your repo's build setup
  cacheOptions: {
    // Generated files in each package that will be saved into the cache
    // (relative to package root; folders must end with **/*)
    outputGlob: ["lib/**/*"],
    // Changes to any of these files/globs will invalidate the cache (relative to repo root;
    // folders must end with **/*). This should include your lock file and any other repo-wide
    // configs or scripts that are outside a package but could invalidate previous output.
    environmentGlob: ["package.json", "yarn.lock", "lage.config.js"],
  },
};
module.exports = config;
```

(You can find more details about this syntax in the [pipelines tutorial](https://microsoft.github.io/lage/docs/Tutorial/pipeline).)

You can now run this command:

```
lage test
```

`lage` will detect that you need to run `build` steps before `test`s are run.

## Next steps

Take a look at some of the other resources on the website:

- [Introduction and overview](https://microsoft.github.io/lage/docs/Introduction) of how `lage` works
- [Tutorial](https://microsoft.github.io/lage/docs/Tutorial/pipeline) about the `pipeline` syntax and other `lage` concepts
- [CLI reference](https://microsoft.github.io/lage/docs/Reference/cli)
- [Config reference](https://microsoft.github.io/lage/docs/Reference/config)
- [Recipes](https://microsoft.github.io/lage/docs/Cookbook/make-jest-fast) for integrating with Jest, ESLint, and more
