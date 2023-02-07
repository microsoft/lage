# Release v2.0.0

Lage version 2 is now available at dist-tag `@latest`, featuring significant updates and improvements that make this release truly unique:

* Brand new UI! Easier on the eyes for local interactive view of work done by workers
* Built-in lighter weight, flexible multi-threading model with a worker pool
* New `worker` target type that can enable multi-core for various tools like TypeScript and ESLint
* Dedicate maximum workers to certain tasks, allowing better utilization of resources
* Customizable CLI argument to be passed along to the `npm script` runner
* Weighted targets to allow better utilization of resources for tasks that spawn multiple processes like Jest
* Smaller installation, faster startup times thanks to distributing a pre-made bundle rather than individual scripts
* Featured in v1, but expanded in v2: the configuration syntax of pipelines is improved to allow for more [configuration options](https://microsoft.github.io/lage/docs/Reference/config#a-complete-tour-of-the-config)
* Remote fall back cache to speed up local development experience
* `@lage-run` scoped packages are now available to integrate as a set of Node.js API such as target graphs, scheduling, worker pool, logging, caching, etc.

## Get started today

Installing `lage` has always been a single package dependency and one installation away. Add `lage` to your `package.json` as one of your `devDependencies`:

```
npm install --save-dev lage
```

or 

```
yarn add -D lage
```

Read up on how to [get started quickly](https://microsoft.github.io/lage/docs/Quick%20Start) in the docs!
