## Options

### CacheOptions

_type: BackfillCacheOptions & { environmentGlob: string[] }_

### ConfigOptions

#### cache

_type: boolean_

Should cache be enabled

#### cacheOptions

_type: [CacheOptions](#CacheOptions)_

Backfill cache options

#### ignore

_type: string[]_

Which files to ignore when calculating scopes

#### npmClient

_type: "npm" | "yarn" | "pnpm"_

Which NPM Client to use when running npm lifecycle scripts

#### pipeline

_type: [Pipeline](#Pipeline)_

Defines the task pipeline, prefix with "^" character to denote a topological dependency

#### priorities

_type: [Priority](#Priority)[]_

Optional priority to set on tasks in a package to make the scheduler give priority to tasks on the critical path for high priority tasks

### Pipeline

### Pipelines

_type: Map<string, [Pipeline](#Pipeline)>_

### Priority

#### package

_type: string_

package name, as in package.json

#### priority

_type: number_

priority, the higher the more priority; undefined priority means lowest priority

#### task

_type: string_

task name, as listed in the `scripts` section of package.json
