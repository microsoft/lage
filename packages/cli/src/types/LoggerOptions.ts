import { LogLevel } from "../logger/LogLevel";

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
