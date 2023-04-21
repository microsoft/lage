import type { LogLevel } from "@lage-run/logger";

export interface ReporterInitOptions {
  reporter: string[] | string;
  progress: boolean;
  verbose: boolean;
  grouped: boolean;
  concurrency: number;
  logLevel: keyof typeof LogLevel;
  profile?: boolean | string;
  logFile?: string;
}
