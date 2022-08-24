import { LogLevel } from "@lage-run/logger";

export interface LoggerOptions {
  disp?: {
    [level: string]: string;
  };

  style?: {
    [level: string]: { fg?: string; bg?: string };
  };

  levels?: {
    [level: string]: LogLevel;
  };
}

export interface ReporterInitOptions {
  reporter: string[] | string;
  verbose: boolean;
  grouped: boolean;
  logLevel: keyof typeof LogLevel;
}
