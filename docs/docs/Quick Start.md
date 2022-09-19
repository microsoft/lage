---
sidebar_position: 2
sidebar_label: Quick Start
title: Quick Start
---

## Automated Installation

```
npx lage init
```

This will let `lage` install the latest version of lage into your repo as a one of the `devDependencies` at the root level.

`lage` is compatible with all the popular workspace managers, this can be applied to a `yarn`, `pnpm`, or `rush` workspace.

## Customize `lage.config.js`

The `init` command will also generate a default `lage.config.js`. This will likely need to be modified. In particular, pay attention to the `pipeline`
configuration:

```js
module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
    lint: [],
  },
};
```

## Customize workspace (root level) `package.json`

Modify the `package.json` to use `lage` to run your tasks:

```json
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

```
npm run build
```

or 

```
yarn build
```

or

```
pnpm build
```

## Next Steps

Now that you've configured `lage`, dig deeper in the [Tutorial](Tutorial/pipeline.md) section for features like remote caching, task skipping, customized pipelines, and setting priorities.