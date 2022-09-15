---
sidebar_position: 2
sidebar_label: Quick Start
title: Quick Start
---

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
