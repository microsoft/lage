import type { LogLevel } from "@lage-run/logger";

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
