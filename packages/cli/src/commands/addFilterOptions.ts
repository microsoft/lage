import type { Command } from "commander";

export function addFilterOptions(program: Command) {
  return program
    .option("--scope <scope...>", "scopes the run to a subset of packages (by default, includes the dependencies and dependents as well)")
    .option("--no-deps|--no-dependents", "disables running any dependents of the scoped packages")
    .option("--include-dependencies|--dependencies", 'adds the scoped packages dependencies as the "entry points" for the target graph run')
    .option("--to <scope...>", "runs up to a package (shorthand for --scope=<scope...> --no-dependents)")
    .option("--since <since>", "only runs packages that have changed since the given commit, tag, or branch")
    .option(
      "--ignore <ignore...>",
      "ignores files when calculating the scope with `--since` in addition to the files specified in lage.config",
      []
    )
    .option("--allow-no-target-runs");
}
