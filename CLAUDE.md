# CLAUDE.md

This file provides guidance to Claude Code and Copilot when working with code in this repository.

## What is Lage?

Lage ("make" in Norwegian) is a task runner for JavaScript/TypeScript monorepos. It pipelines npm scripts across packages so that, for example, `test` can start as soon as its own package's `build` finishes rather than waiting for all builds. This is a Yarn Berry (v4) workspace monorepo with ~28 packages under `packages/`.

## Common commands

### Repo root commands

These commands work from the repo root.

```bash
yarn build              # transpile + types + bundle (via lage)
yarn test               # run all packages' tests (via lage; does NOT accept jest options)
yarn lint               # lint all packages (via lage)
yarn api                # update API report files (via lage)
yarn ci                 # full CI: transpile, types, build, test, lint, bundle, api (via lage)
yarn format             # prettier --write
yarn format:check       # prettier --check
yarn checkchange        # validate change files exist
yarn deps:check         # dependency audit (depcheck)
yarn lage-local         # run the locally-built lage CLI (node packages/lage/dist/lage.js)
```

Before finalizing changes, run `yarn ci` from the root for complete build/test/lint verification.

### Single-package commands

These commands can be used to verify changes to a single package if you run `cd packages/<name>` before running the command.

```bash
cd packages/<name>
# then run a command
yarn build  # single-package transpile + types
yarn test   # single-package run all packages' tests (accepts jest options)
yarn test --testNamePattern="pattern"  # specific test by name
yarn lint   # single-package lint all packages
yarn api    # single-package update API report files
```

If changes span multiple packages, you should `yarn build` from the root instead of one package. This is the best way to ensure all dependencies build in proper order.

## Architecture

### Key packages

- **`lage`** — CLI entry point, esbuild-bundled into `dist/lage.js`
- **`cli`** — CLI implementation (depends on nearly all other packages)
- **`scheduler`** — Task scheduling engine
- **`target-graph`** — Builds the dependency graph of tasks (targets) across packages
- **`runners`** — Task runner implementations (npm script, worker)
- **`cache`** — Caching layer (wrapping `backfill-cache`)
- **`hasher`** — Content hashing for cache invalidation
- **`config`** — Configuration loading via cosmiconfig
- **`worker-threads-pool`** — Worker thread management
- **`reporters`** — Output formatting

The repo also contains the `backfill` family of packages. `backfill` is the underlying caching library for `lage`.

- **`backfill`** — CLI entry point (yargs-based), not directly used by `lage`
- **`backfill-cache`** — Cache providers (local tar + Azure blob storage)
- **`backfill-config`** — Configuration loading (find-up based)
- **`backfill-hasher`** — Git-based content hashing (`lage` uses some of the utilities but not the main `Hasher` class)
- **`backfill-logger`** — Logging and output handling

The **`workspace-tools`** helper library is also hosted in this repo.

### Shared tooling (`scripts/` package)

`@lage-run/monorepo-scripts` (aliased as `monorepo-scripts` bin) provides shared build commands (`transpile`, `lint`, etc) used by all packages. Shared configs live in `scripts/config/` (jest, eslint, tsconfig base).

### Output convention

- `lib/` — transpiled JS + type declarations (all packages except `lage`)
- `dist/` — esbuild bundle (`lage` package only)

## Code style

- TypeScript strict mode, ES2020 target, CommonJS modules
- **Consistent type imports required**: use `import type { Foo }` or `import { type Foo, ValueBar }`
- **File extensions required in TS imports**: e.g., `import { foo } from "./foo.js"`
- **No `require()` in .ts files**
- **No `console.log`** — use the logger package
- **No floating promises** — all promises must be awaited
- **Explicit return types** on exported functions
- Prettier: 140 char width, double quotes, 2-space indent, LF line endings
- Pre-commit hook runs prettier via lint-staged

## Versioning & release

Every PR must include a [`beachball`](https://github.com/microsoft/beachball) change file. Use the `/beachball-change-file` skill to create one.
