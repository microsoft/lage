import type { LogLevel } from "@lage-run/logger";

/** All the built-in reporter names */
export type BuiltInReporterName =
  | "default"
  | "profile"
  | "json"
  | "azureDevops"
  | "adoLog"
  | "githubActions"
  | "gha"
  | "npmLog"
  | "old"
  | "verboseFileLog"
  | "vfl"
  | "fancy";
/** Built-in or custom reporter name */
export type ReporterName = BuiltInReporterName | string;

/** Whether each built-in reporter name should be listed in doc output */
const shouldListBuiltInReporters: Record<BuiltInReporterName, boolean> = {
  json: true,
  azureDevops: true,
  npmLog: true,
  verboseFileLog: true,
  vfl: true,
  adoLog: true,
  githubActions: true,
  gha: true,
  fancy: true,
  default: true,
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
}
