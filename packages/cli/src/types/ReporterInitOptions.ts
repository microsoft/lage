import type { LogLevel } from "@lage-run/logger";

/** All the built-in reporter names */
export type BuiltInReporterName =
  | "default"
  | "profile"
  | "json"
  | "azureDevops"
  | "adoLog"
  | "npmLog"
  | "old"
  | "verboseFileLog"
  | "vfl"
  | "fancy";
/** Built-in or custom reporter name */
export type ReporterName = BuiltInReporterName | string;

export const builtInReporterNames = Object.keys({
  json: true,
  azureDevops: true,
  npmLog: true,
  verboseFileLog: true,
  vfl: true,
  adoLog: true,
  old: true,
  default: true,
  profile: true,
  fancy: true,
  // This verifies all reporters are listed
} satisfies Record<BuiltInReporterName, true>);

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
