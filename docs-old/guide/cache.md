# Caching

`lage` by default will cache tasks that it has already done recently locally on disk. As long as the source file and the command arguments have not changed, those cached results will be restored.

See [Remote Cache](./remote-cache) for details about speeding up local dev environment even further with a remote cache from Continuous Integration jobs.

## Turn off cache

Sometimes, this incremental behavior is not desired. You can override the caching behavior by using the `--no-cache` argument.

```
$ lage build --no-cache
```

## Resetting cache

Once in a while, the cache might need to be recreated from scratch. In those situations, you can reset the cache by passing in the `--reset-cache` argument to the command line.

```
lage --reset-cache
```

## Cache Options

Caching capability is provided by `backfill`. All of the configuration under the `cacheOptions` key is passed to `backfill`. For the complete documentation of `cacheOptions`, see the [`backfill` configuration documentation](https://github.com/microsoft/backfill#configuration)
