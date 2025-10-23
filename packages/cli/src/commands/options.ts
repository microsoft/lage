import { Option } from "commander";
import { builtInReporterNames } from "../types/ReporterInitOptions.js";

const isCI = process.env.CI || process.env.TF_BUILD;

const reporterChoices = builtInReporterNames.filter((n) => n !== "default" && n !== "profile");

const options = {
  logger: {
    reporter: new Option("--reporter <reporter...>", `log reporter (built-in choices: ${reporterChoices.join(", ")})`),
    grouped: new Option("--grouped", "groups the logs").default(false),
    progress: new Option("--progress").conflicts(["reporter", "grouped", "verbose"]).default(!isCI),
    logLevel: new Option("--log-level <level>", "log level").choices(["info", "warn", "error", "verbose", "silly"]).conflicts("verbose"),
    logFile: new Option("--log-file <file>", "when used with --reporter vfl, writes verbose, ungrouped logs to the specified file"),
    verbose: new Option("--verbose", "verbose output").default(false),
    indented: new Option("--indented", "enabled indentation of the JSON output").default(false),
  },
  pool: {
    concurrency: new Option("-c|--concurrency <number>", "max jobs to run at a time").argParser((v) => parseInt(v)),
    continue: new Option("--continue", "continue running even after encountering an error for one of the targets"),
    maxWorkersPerTask: new Option(
      "--max-workers-per-task <maxWorkersPerTarget...>",
      "set max worker per task, e.g. --max-workers-per-task build=2 test=4"
    ).default([]),
  },
  runner: {
    nodeArg: new Option(
      "-n|--node-arg <arg>",
      'node arguments as a string to be passed into node like a NODE_OPTIONS setting, (e.g. --nodearg="--max_old_space_size=1234 --heap-prof")'
    ),
  },
  run: {
    cache: new Option("--no-cache", "disables the cache"),
    resetCache: new Option("--reset-cache", "resets the cache, filling it after a run"),
    skipLocalCache: new Option("--skip-local-cache", "skips caching locally (defaults to true in CI environments)").default(isCI),
    profile: new Option("--profile [profile]", "writes a run profile into a file that can be processed by Chromium devtool"),
    continue: new Option("--continue", "continues the run even on error"),
    allowNoTargetRuns: new Option("--allow-no-target-runs"),
    watch: new Option("--watch", "runs in watch mode"),
  },
  server: {
    server: new Option("--server [host:port]", "Run targets of type 'worker' on a background service"),
    tasks: new Option("--tasks <tasks...>", "A list of tasks to run, separated by space e.g. 'build test'"),
    timeout: new Option("-t|--timeout <seconds>", "lage server autoshutoff timeout").default(5 * 60).argParser((v) => parseInt(v)),
  },
  filter: {
    scope: new Option(
      "--scope <scope...>",
      "scopes the run to a subset of packages (by default, includes the dependencies and dependents as well)"
    ),
    noDeps: new Option("--no-deps|--no-dependents", "disables running any dependents of the scoped packages"),
    includeDependencies: new Option(
      "--include-dependencies|--dependencies",
      'adds the scoped packages dependencies as the "entry points" for the target graph run'
    ),
    to: new Option("--to <scope...>", "runs up to a package (shorthand for --scope=<scope...> --no-dependents)"),
    since: new Option("--since <since>", "only runs packages that have changed since the given commit, tag, or branch"),
    ignore: new Option(
      "--ignore <ignore...>",
      "ignores files when calculating the scope with `--since` in addition to the files specified in lage.config"
    ).default([]),
  },
  affected: {
    outputFormat: new Option(
      "--output-format <graph|json|default>",
      `Generate a report about what packages are affected by the current change (defaults to human readable format) ` +
        `"graph" will generate a GraphViz .dot file format`
    ),
  },
  cache: {
    prune: new Option("--prune <days>", "Prunes cache older than certain number of <days>").argParser(parseInt).conflicts("--clear"),
    clear: new Option("--clear", "Clears the cache locally"),
  },
  info: {
    outputFile: new Option("-o|--output-file <file>", "Output the target graph as json to the specified file."),
    noOptimizeGraph: new Option("--no-optimize-graph", "Do not optimize the target graph"),
  },
} as const;

const optionsWithEnv = addEnvOptions(options);

function addEnvOptions(opts: typeof options) {
  for (const key in opts) {
    for (const [name, option] of Object.entries<Option>((opts as any)[key])) {
      // convert the camel cased name to uppercase with underscores
      const upperCaseSnakeKey = key.replace(/([A-Z])/g, "_$1").toUpperCase();
      const upperCaseSnakeName = name.replace(/([A-Z])/g, "_$1").toUpperCase();
      option.env(`LAGE_${upperCaseSnakeKey}_${upperCaseSnakeName}`);
    }
  }

  return opts;
}

export { optionsWithEnv as options };
