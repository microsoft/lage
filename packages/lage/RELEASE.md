# Release v2.0.0

Lage version 2 is now available at dist-tag `@latest`, featuring significant updates and improvements that make this release truly unique:


* `worker_threads` based worker pool to manage the parallel targets
* new `worker` target runner that can keep state from task to task to speed up TypeScript, ESLint, etc.
* worker pool that allows allocation of certain number of workers per task type
* customizable CLI argument to be passed along to the `npm script` runner
* weighted targets to allow better utilization of resources for tasks that spawn multiple processes like Jest
* brand new UI for an local interactive view of work done by workers
* lage is a bundled and minimized, making the package itself easy to install
* featured in v1, but expanded in v2: the configuration syntax of pipelines is expanded to allow for more configuration options
* switched from `yargs` to `commander` has made the CLI arg parsing to be more resilient and help messages more ... helpful 
* fully functional remote fall back cache for local development experience that takes advantage of the remote cache
* @lage-run scoped packages are now available to integrate as a set of Node.js API such as target graphs, scheduling, worker pool, logging, caching, etc.
