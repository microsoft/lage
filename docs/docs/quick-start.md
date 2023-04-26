---
sidebar_position: 2
sidebar_label: Quick Start
title: Quick Start
---

## Automated Installation

To automatically install `lage` as a `devDependency` at your workspace's root and create a default `lage.config.js`, run:

```
npx lage init
```

`lage` is compatible with all the popular workspace managers, including `yarn`, `npm`, `pnpm`, and `rush`.

## Customize `lage.config.js`

The `init` command will also generate a default `lage.config.js`. This will likely need to be modified. In particular, pay attention to the `pipeline`
configuration:

```js title="/lage.config.js"
module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
    lint: []
  }
};
```

## Customize workspace (root level) `package.json`

Modify the `package.json` to use `lage` to run your tasks:

```json title="/package.json"
{
  "name": "workspace-root",
  "scripts": {
    "build": "lage build",
    "test": "lage test",
    "lint": "lage lint"
  },
  "devDependencies": {
    "lage": "latest"
  }
}
```

## Ready to Build, Test, and Lint!

You are now ready to start running all the commands in your repository with `lage`. You'll notice that tasks are now cached!

For example (choose the appropriate command for your package manager):

```shell
# choose one
npm run build
yarn build
pnpm build
```

## Next Steps

Now that you've configured `lage`, dig deeper in the [Tutorial](Tutorial/pipeline.md) section for features like remote caching, task skipping, customized pipelines, and setting priorities.
