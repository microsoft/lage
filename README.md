# lage

Documentation is here: https://microsoft.github.io/lage/

This repo is also home to [`backfill`](./packages/backfill) and [`workspace-tools`](./packages/workspace-tools).

## Benchmarking cached builds

After `yarn build`, run `node benchmark/cache-hit.mjs --repo <repository-path>` against an installed repository.
The benchmark runs the complete `build` task graph once to warm its local cache, then measures three fresh CLI processes.
It fails unless every measured target is cached and every run finishes within five seconds.
Use `--max-seconds`, `--runs`, and `--expected-targets` to set explicit acceptance criteria; `--cli` can select a baseline CLI.
Use `--output <external-json-path>` to save wall-clock timings and target counts outside the benchmarked repository.
Use `--native 1` to require the optional Rust validator or `--native 0` to measure the JavaScript fallback with identical build inputs.
Reports record CLI/native binary hashes and reject artifact changes during measurement.
This measures Lage itself, not additional Docker, packaging, or other steps in a repository's wrapper scripts.

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
