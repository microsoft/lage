---
sidebar_position: 1

title: Installation
---

Getting started with `lage` is easy.

## Quick installation

For automated quick installation instructions, see the [quick start guide](../quick-start.md).

## Manual installation

If you prefer having more control, you can install `lage` manually.

This example assumes that some or all of the packages in your workspace define `build`, `test`, and `lint` scripts in their `package.json` files. You can use any script names that are relevant for your repo instead.

### 1. Install `lage` at the root level

In your workspace root `package.json`, add `lage` under `devDependencies`.

Feel free to replace `latest` tag with something specific. Take a look at the [npm link for lage](https://www.npmjs.com/package/lage) to see what the latest version may be at the time.

```jsonc title="/package.json"
{
  "devDependencies": {
    // ...
    "lage": "latest"
    // ...
  }
}
```

Then run the appropriate install command for your workspace manager, e.g.:

```shell
# pick one
yarn
pnpm install
npm install
rush install
```

### 2. Define scripts to run `lage`

Next, add scripts inside the workspace root `package.json` to run `lage`. For example:

```json title="/package.json"
{
  "scripts": {
    "build": "lage build",
    "test": "lage test"
  }
}
```

### 3. Add a `lage.config.js` file to configure the pipeline

Create a file `lage.config.js` at the workspace root, and configure task dependencies using the `pipeline`. For example:

```js title="/lage.config.js"
/** @type {import("lage").ConfigFileOptions} */
const config = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
    lint: []
  },
  // Update these according to your repo's build setup
  cacheOptions: {
    // Generated files in each package that will be saved into the cache
    // (relative to package root; folders must end with **/*)
    outputGlob: ["lib/**/*"],
    // Changes to any of these files/globs will invalidate the cache (relative to repo root;
    // folders must end with **/*). This should include your lock file and any other repo-wide
    // configs or scripts that are outside a package but could invalidate previous output.
    environmentGlob: ["package.json", "yarn.lock", "lage.config.js"]
  }
};
module.exports = config;
```

See the [Pipelines page](./pipeline.md) for more info about this syntax.

### 4. Run `lage` commands

You are now ready to start running all the commands in your repository with `lage`. You'll notice that tasks are now cached!

```shell
# choose one
yarn build
npm run build
pnpm run build
```
