import type { LogLevel } from "@lage-run/logger";

/** All the built-in reporter names */
export type BuiltInReporterName =
  // See initializeReporters and createReporter
  | "default"
  // ChromeTraceEventsReporter (via --profile)
  | "profile"
  // JsonReporter
  | "json"
  // AdoReporter
  | "azureDevops"
  | "adoLog"
  // GithubActionsReporter
  | "githubActions"
  | "gha"
  // LogReporter
  | "npmLog"
  | "old"
  // VerboseFileLogReporter
  | "verboseFileLog"
  | "vfl"
  // ProgressReporter
  | "fancy"
  // BasicReporter
  | "basic";
/** Built-in or custom reporter name */
export type ReporterName = BuiltInReporterName | string;

/** Whether each built-in reporter name should be listed in doc output */
const shouldListBuiltInReporters: Record<BuiltInReporterName, boolean> = {
  // this determines the order in help output
  default: true,
  basic: true,
  fancy: true,
  npmLog: true,
  adoLog: true,
  azureDevops: true,
  githubActions: true,
  gha: true,
  json: true,
  verboseFileLog: true,
  vfl: true,
  // Not encouraged
  old: false,
  // Intended to be set via --profile
  profile: false,
};

/** All the built-in reporter names */
export const builtInReporterNames: string[] = Object.keys(shouldListBuiltInReporters);

/** Built-in reporter names that should be listed in doc output */
export const logBuiltInReporterNames: string[] = builtInReporterNames.filter(
  (name) => shouldListBuiltInReporters[name as BuiltInReporterName]
);

/**
 * Options for initializing reporters.
 * This is also passed to the constructor of a custom reporter class.
 */
export interface ReporterInitOptions {
  reporter: ReporterName[] | ReporterName | undefined;
  progress: boolean;
  verbose: boolean;
  grouped: boolean;
  concurrency: number;
  logLevel: keyof typeof LogLevel;
  profile?: boolean | string;
  logFile?: string;
  indented?: boolean;
  /** Whether to capture and report main process memory usage on target completion */
  logMemory?: boolean;
}
