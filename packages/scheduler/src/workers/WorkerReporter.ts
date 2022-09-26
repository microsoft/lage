import type { LogEntry, LogLevel, LogStructuredData, Reporter } from "@lage-run/logger";

export class WorkerReporter implements Reporter {
  constructor(private options: { logLevel: LogLevel }) {}

  log(entry: LogEntry<LogStructuredData>) {
    if (this.options.logLevel >= entry.level) {
      console.log(entry.data);
    }
  }

  summarize(_summary: unknown) {
    // Workers do not report a summary
  }
}
