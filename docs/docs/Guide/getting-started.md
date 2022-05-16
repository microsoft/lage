---
sidebar_position: 1

title: Getting Started
---

# Getting started

Getting started with `lage` is quite easy! There are 2 ways to do this: automated or manual.

## Automated

### 1. Invoke the `lage init` command in the monorepo root to get started:

```
npx lage init
```

This will let `lage` install the latest version of lage into your repo as a one of the `devDependencies` at the root level.

Since `lage` is compatible with all the popular workspace managers, this can be applied to a `yarn`, `pnpm`, or `rush` workspace. `lage` is an excellent
replacement for `lerna` in handling running tasks in your repo topologically.

### 2. Customize `lage.config.js`

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

You may or may not have these scripts in your packages' `package.json` files. Remember the `^` character is to indicate that the task is run in
topological order.

To build with the freshly installed `lage` runner, type the following:

```
npm run lage build
```

or

```
yarn lage build
```

## Manual - Yarn and PNPM Workspaces

You can manually install `lage` as well.

### 1. Place `lage` in the `devDependencies` at the root level:

```json
{
  "devDependencies": {
    ...,
    "lage": "0.16.0",
    ...
  }
}
```

### 2. Add a `lage.config.js` file to configure the pipeline:

```js
module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
    lint: [],
  },
};
```

### 3. Inside your monorepo, run `yarn` or `pnpm install`

```
yarn
```

or

```
pnpm install
```

### 4. Run `lage` commands

```
yarn lage build
```

or

```
pnpm run lage build
```
