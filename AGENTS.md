# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

This repo is public on GitHub. Do not use MCPs for Azure DevOps (unless the request relates to Azure DevOps pipelines).

## What is Lage?

Lage ("make" in Norwegian) is a task runner for JavaScript/TypeScript monorepos. It pipelines npm scripts across packages so that, for example, `test` can start as soon as its own package's `build` finishes rather than waiting for all builds. This is a Yarn Berry (v4) workspace monorepo with TypeScript packages and the Rust/NAPI-RS `glob-hasher` native addon under `packages/`.

## Common commands

### Repo root commands

These commands work from the repo root.

```bash
yarn build              # transpile + types + native build + bundle + api (via lage)
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

When completing more complex production-code changes, run `yarn ci` from the root for complete build/test/lint verification. For test-only changes, run focused tests in the affected package instead of full CI. For documentation-only or comment-only changes, format the touched files without running CI. Honor explicit requests not to run tests, CI, or typechecking, and report which checks were skipped.

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

### Native package commands

Run these commands from the repository root:

```bash
yarn lage build --to 'glob-hasher*' # build and copy available native bindings
yarn lage test --to glob-hasher    # build, copy bindings, and run tests
yarn workspace glob-hasher lint   # only glob-hasher itself has lint
```

Native builds do not cross-compile missing platforms. For declaration checks, use `yarn lage types --to glob-hasher`; Lage handles prerequisite tasks.

- `index.js` and `index.d.ts` in `packages/glob-hasher/` are generated. Change Rust sources, rebuild, and include generated diffs rather than editing them manually.
- Run direct Cargo commands from `packages/glob-hasher/`; its `rust-toolchain.toml` selects the compiler and components.
- Use `SKIP_RUST=1` only when native binaries are already available. It skips Rust builds and lint; Jest tests still run.

## Coding patterns

Code must work on Windows, Mac, and Linux.

### Testing conventions

- Keep tests for each utility in its own file. Reuse existing suite wrappers and helpers rather than replacing their assertion structure.
- Test filtering and graph logic with prepared inputs or change snapshots rather than invoking upstream Git collectors; cover collection behavior in the collector's own suite.
- Give parameterized cases semantic descriptions that state the scenario and expected behavior. Ensure titles match the effective configuration and assertions, and avoid redundant cases that exercise the same behavior.

### Git change collection

Git calls are expensive in large monorepos. Collect changes once per command and pass the resulting snapshot to filtering and graph construction. Reuse existing `workspace-tools` helpers and collected package metadata rather than adding redundant queries; check Git call counts when changing collection paths.

### Code style

- TypeScript strict mode, ES2020 target, CommonJS modules
- **Consistent type imports required**: use `import type { Foo }` or `import { type Foo, ValueBar }`
- **File extensions required in TS imports**: e.g., `import { foo } from "./foo.js"`
- **No `require()` in .ts files**
- **No `console.log`** — use the logger package
- **No floating promises** — all promises must be awaited
- **Explicit return types** on exported functions
- Prettier: 140 char width, double quotes, 2-space indent, LF line endings
- Pre-commit hook runs prettier via lint-staged

## Architecture

### Repository layout

- `packages/` contains the publishable libraries and CLI. `packages/glob-hasher-native/*` contains nested binary workspaces.
- `packages/e2e-tests/` contains end-to-end CLI tests.
- `docs/` is the Docusaurus website, managed as a separate Yarn project. See [docs/README.md](docs/README.md) for documentation setup and [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.
- `scripts/` contains shared development tooling.
- `benchmark/` contains performance benchmarks.
- `lage.config.js` defines the task pipeline; `beachball.config.js` defines versioning and publishing rules.

### Key packages

- **`lage`** — CLI entry point, esbuild-bundled into `dist/lage.js`
- **`cli`** — CLI implementation (depends on nearly all other packages)
- **`scheduler`** — Task scheduling engine
- **`target-graph`** — Builds the dependency graph of tasks (targets) across packages
- **`runners`** — Task runner implementations (npm script, worker)
- **`cache`** — Caching layer (wrapping `backfill-cache`)
- **`hasher`** — Content hashing for cache invalidation
- **`glob-hasher`** — Rust native globbing and hashing with a generated NAPI-RS loader and declarations
- **`glob-hasher-native/*`** — Platform-specific binary workspaces selected by the wrapper's optional dependencies
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

- `lib/` — transpiled JS + type declarations (TypeScript library packages)
- `dist/` — esbuild bundle (`lage` package only)
- `packages/glob-hasher/target/` — Cargo build output
- `glob-hasher.<platform>.node` — compiled in `packages/glob-hasher/`; each platform package's `build` script runs `monorepo-scripts rust copy` to copy its binding, if present, into the matching workspace under `packages/glob-hasher-native/`, where Lage caches that package's output

## Versioning & release

Every PR must include a [`beachball`](https://github.com/microsoft/beachball) change file. Use the `/beachball-change-file` skill to create one.
