# @lage-run/target

This package contains the actual class for a `target`. It is the fundamental smallest unit of work as executable by an executor. A Target itself does not contain an executor function. Here are some characteristics of a `target`:

1. contains an ID that is unique, but is consistently generated based on the package and task graph
2. which npm client to use for running the task
3. command line or a function to run

```ts
executor.run(target)
```

```ts

```
