import { Option } from "commander";
import { logBuiltInReporterNames, type ReporterName } from "../types/ReporterNames.js";
import type { LogLevel } from "@lage-run/logger";

const isCI = process.env.CI || process.env.TF_BUILD;

export interface LoggerCliOptions {
  /** log reporter */
  reporter?: ReporterName | ReporterName[];
  /** groups the logs */
  grouped?: boolean;
  /** show progress */
  progress: boolean;
  /** log level (default "info" unless `--verbose`) */
  logLevel: keyof typeof LogLevel;
  /** when used with `--reporter vfl`, writes verbose, ungrouped logs to the specified file */
  logFile?: string;
  /** verbose output */
  verbose?: boolean;
  /** enabled indentation of the JSON output */
  indented?: boolean;
}

export interface PoolCliOptions {
  /** max jobs to run at a time */
  concurrency?: number;
  /** continue running even after encountering an error for one of the targets */
  continue?: boolean;
  /** set max worker per task, e.g. --max-workers-per-task build=2 test=4 */
  maxWorkersPerTask: string[];
}

export interface RunnerCliOptions {
  /**
   * node arguments for workers and child processes (like NODE_OPTIONS) as a single string
   * (e.g. --node-arg="--max_old_space_size=1234 --heap-prof")
   */
  nodeArg?: string;
}

export interface RunCliOptions {
  /** disables the cache */
  cache: boolean;
  /** resets the cache, filling it after a run */
  resetCache?: boolean;
  /** skips caching locally (defaults to true in CI environments) */
  skipLocalCache?: boolean;
  /** writes a run profile into a file that can be processed by Chromium devtool */
  profile?: boolean | string;
  /** continues the run even on error */
  continue?: boolean;
  /** succeed even if no targets match the given name */
  allowNoTargetRuns?: boolean;
  /** runs in watch mode */
  watch?: boolean;
  /** Whether to capture and report main process memory usage on target completion */
  logMemory?: boolean;
}

export interface ServerCliOptions {
  /** Run targets of type 'worker' on a background service (hostname and optional port) */
  server?: boolean | string;
  /** A list of tasks to run, separated by space e.g. 'build test' */
  tasks?: string[];
  /** lage server autoshutoff timeout */
  timeout: number;
}

export interface FilterCliOptions {
  /** scopes the run to a subset of packages (by default, includes the dependencies and dependents as well) */
  scope?: string[];
  /** disables running any dependents of the scoped packages @default true */
  dependents: boolean;
  /** adds the scoped packages dependencies as the "entry points" for the target graph run */
  dependencies?: boolean;
  /** runs up to a package (shorthand for --scope=<scope...> --no-dependents) */
  to?: string[];
  /** only runs packages that have changed since the given commit, tag, or branch */
  since?: string;
  /** ignores files when calculating the scope with `--since` in addition to the files specified in lage.config */
  ignore: string[];
}

export interface AffectedCliOptions {
  /**
   * Generate a report about what packages are affected by the current change (defaults to human readable format).
   * "graph" will generate a GraphViz .dot file format
   */
  outputFormat?: "graph" | "json" | "default";
}

export interface CacheCliOptions {
  /** Prunes cache older than certain number of <days> */
  prune?: number;
  /** Clears the cache locally */
  clear?: boolean;
}

export interface InfoCliOptions {
  /** Output the target graph as json to the specified file. */
  outputFile?: string;
  /** Do not optimize the target graph */
  optimizeGraph: boolean;
}

function getEnvName(groupName: string, name: string): string {
  const upperCaseSnakeKey = groupName.replace(/([A-Z])/g, "_$1").toUpperCase();
  const upperCaseSnakeName = name.replace(/([A-Z])/g, "_$1").toUpperCase();
  return `LAGE_${upperCaseSnakeKey}_${upperCaseSnakeName}`;
}

// NOTE: modified below to add `env` for each option
export const options: {
  logger: Record<keyof LoggerCliOptions, Option>;
  pool: Record<keyof PoolCliOptions, Option>;
  runner: Record<keyof RunnerCliOptions, Option>;
  run: Record<keyof RunCliOptions, Option>;
  server: Record<keyof ServerCliOptions, Option>;
  filter: Record<keyof FilterCliOptions, Option>;
  affected: Record<keyof AffectedCliOptions, Option>;
  cache: Record<keyof CacheCliOptions, Option>;
  info: Record<keyof InfoCliOptions, Option>;
} = {
  logger: {
    reporter: new Option("--reporter <reporter...>", `log reporter (built-in choices: ${logBuiltInReporterNames.join(", ")})`),
    grouped: new Option("--grouped", "groups the logs"),
    progress: new Option("--progress", "show progress").conflicts(["reporter", "grouped", "verbose"]).default(!isCI),
    logLevel: new Option("--log-level <level>", "log level")
      .choices(["info", "warn", "error", "verbose", "silly"] satisfies (keyof typeof LogLevel)[])
      .conflicts("verbose")
      .default("info"),
    logFile: new Option("--log-file <file>", "when used with --reporter vfl, writes verbose, ungrouped logs to the specified file"),
    verbose: new Option("--verbose", "verbose output"),
    indented: new Option("--indented", "enabled indentation of the JSON output"),
  },
  pool: {
    concurrency: new Option("-c|--concurrency <number>", "max jobs to run at a time").argParser((v) => parseInt(v)),
    continue: new Option("--continue", "continue running even after encountering an error for one of the targets"),
    maxWorkersPerTask: new Option(
      "--max-workers-per-task <values...>",
      "set max worker per task, e.g. --max-workers-per-task build=2 test=4"
    ).default([]),
  },
  runner: {
    nodeArg: new Option(
      "-n|--node-arg <arg>",
      'node arguments for workers and child processes (like NODE_OPTIONS) as a single string (e.g. --node-arg="--max_old_space_size=1234 --heap-prof")'
    ),
  },
  run: {
    cache: new Option("--no-cache", "disables the cache"),
    resetCache: new Option("--reset-cache", "resets the cache, filling it after a run"),
    skipLocalCache: new Option("--skip-local-cache", "skips caching locally (defaults to true in CI environments)").default(isCI),
    profile: new Option("--profile [profile]", "writes a run profile into a file that can be processed by Chromium devtool"),
    continue: new Option("--continue", "continues the run even on error"),
    allowNoTargetRuns: new Option("--allow-no-target-runs", "succeed even if no targets match the given name"),
    watch: new Option("--watch", "runs in watch mode"),
    logMemory: new Option("--log-memory", "log main process memory usage at task completion"),
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
    // keep historical env names
    dependents: new Option("--no-deps|--no-dependents", "disables running any dependents of the scoped packages").env(
      getEnvName("filter", "noDeps")
    ),
    dependencies: new Option(
      "--include-dependencies|--dependencies",
      'adds the scoped packages dependencies as the "entry points" for the target graph run'
    ).env(getEnvName("filter", "includeDependencies")),
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
      `Generate a report about what packages are affected by the current change (defaults to human readable format). ` +
        `"graph" will generate a GraphViz .dot file format`
    ),
  },
  cache: {
    prune: new Option("--prune <days>", "Prunes cache older than certain number of <days>").argParser(parseInt).conflicts("--clear"),
    clear: new Option("--clear", "Clears the cache locally"),
  },
  info: {
    outputFile: new Option("-o|--output-file <file>", "Output the target graph as json to the specified file."),
    optimizeGraph: new Option("--no-optimize-graph", "Do not optimize the target graph"),
  },
};

for (const [groupName, group] of Object.entries(options)) {
  for (const [name, option] of Object.entries<Option>(group)) {
    if (!(option as { envVar?: unknown }).envVar) {
      option.env(getEnvName(groupName, name));
    }
  }
}
