# @lage-run/grapher

Generates a list of dependents and dependencies (internal to the monorepo) for a package or packages.

For one package:

```
npx @lage-run/grapher deps --scope foo
```

For multiple packages:

```
npx @lage-run/grapher deps --scope foo --scope bar
```
