/**
 * Valid log levels.
 * A higher number means a more verbose log level.
 */
export const LogLevel = {
  error: 10,
  warn: 20,
  info: 30,
  verbose: 40,
  silly: 50,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];
