> Repository guidance for coding agents lives in [AGENTS.md](./AGENTS.md).

## Development setup

1. Install tools:
   - Node version from [`.nvmrc`](.nvmrc)
   - Yarn (corepack or `npm i -g yarn`)
   - Rust via [rustup](https://rustup.rs/) (`packages/glob-hasher/rust-toolchain.toml` selects the compiler and components)
2. Install dependencies:
   ```sh
   yarn
   ```
3. Build only, or build/test/lint:
   ```sh
   yarn build
   yarn ci
   ```

## Package guide for contributors

> For more about the concepts behind Lage, see [introduction](https://microsoft.github.io/lage/docs/introduction) and [concept guides](https://microsoft.github.io/lage/docs/guides/) on the website (or corresponding pages under `/docs/docs` in this repo).

Lage represents each task in a package as a target, such as `my-package#build`, based on the pipeline config and repo dependency graph.

The [**CLI**](./packages/cli) parses commands and options, loads configuration, selects packages and tasks, and wires together the graph, cache, scheduler, and reporters. The published executable lives in [`packages/lage`](./packages/lage).

The CLI uses the following helper packages:

- [**Config**](./packages/config): Loads Lage configuration, applies defaults, and provides shared configuration types and option helpers.
- [**Scheduler**](./packages/scheduler): Runs targets as their dependencies finish, respecting concurrency limits and coordinating task execution, caching, and failures.
- [**Reporters**](./packages/reporters): Turn structured log events and run summaries into user-facing output, including task progress, errors, and timing information.
- [**Cache**](./packages/cache): Wraps Backfill cache providers to restore and save task outputs locally or remotely, allowing unchanged work to be skipped.
- [**Target graph**](./packages/target-graph): Defines targets and builds their dependency graph from package relationships and pipeline configuration, determining which tasks must finish before others can start.
- [**Worker threads pool**](./packages/worker-threads-pool): Manages reusable Node.js worker threads for task execution, keeping each target's output associated with the correct task for logging and caching.
- [**Logger**](./packages/logger): Provides shared logging APIs and structured log entries, forwarding messages and summaries to registered reporters. Reporters control presentation; the logger distributes the events.

## `glob-hasher`

The `glob-hasher` package is written in Rust and uses [Node-API 10](https://nodejs.org/api/n-api.html#node-api-version-matrix) via NAPI-RS 3 to interface with Node.js.

Native platform packages live under [`packages/glob-hasher-native/`](packages/glob-hasher-native/) and support macOS, Windows, and Linux glibc on x64 and ARM64, plus Linux musl on x64 (including Alpine). Linux musl support is best effort and is not runtime-tested in CI. The glibc baseline is defined and checked in the [native CI workflow](.github/workflows/pr.yml).

### Development

Rust builds are orchestrated as part of the main `lage`-based build setup, and the build scripts are defined in `package.json` `scripts`. Some of them use the [`monorepo-scripts rust ...` wrapper](scripts/commands/rust.js).

Follow the [general setup steps](#development-setup), then run the following from the repository root (the Rust code is also included in a full repo build):

```sh
# Build all glob-hasher packages and copy binaries
yarn lage build --to 'glob-hasher*'

# Build glob-hasher, copy binaries, run tests
yarn lage test --to glob-hasher

# Only glob-hasher itself has lint
yarn workspace glob-hasher lint
```

Rust compilation writes the host binding only to `packages/glob-hasher/`, so Lage can cache and restore it without cross-package side effects.

Each platform package's `build` script runs `monorepo-scripts rust copy` after `glob-hasher#build` per `lage.config.js`. It copies that package's binding from `packages/glob-hasher/` if present; missing source bindings are skipped without removing previously assembled binaries.

Set `SKIP_RUST=1` when running Lage to reuse existing native binaries without running `glob-hasher`'s Rust build or lint targets. Platform copy "builds", Jest tests, and TypeScript declaration checks still run. `glob-hasher`'s Jest target depends on every platform copy build, validates the relevant packages' file lists, and exercises the host package's binary directly.

`index.js` and `index.d.ts` are generated NAPI-RS bindings. Local builds generate both into `temp/` and automatically update their checked-in copies when content changes. Review and commit these generated diffs alongside Rust API changes.

The [PR workflow](.github/workflows/pr.yml) builds and validates the supported native targets before running workspace CI.
