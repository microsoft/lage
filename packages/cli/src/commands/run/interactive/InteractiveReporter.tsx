import { LogLevel } from "@lage-run/logger";
import type { Reporter, LogEntry } from "@lage-run/logger";
import type { SchedulerRunSummary, TargetStatus } from "@lage-run/scheduler";
import { render } from "ink";
import { App } from "./App";
import React from "react";

process.env.FORCE_COLOR = "0";

export class InteractiveReporter implements Reporter {
  entries: LogEntry<any>[] = [];
  rerender: (node: React.ReactNode) => void;

  constructor(private options: { logLevel?: LogLevel; grouped?: boolean }) {
    const { rerender } = render(<App entries={this.entries} />, { patchConsole: true });
    this.rerender = rerender;
  }

  log(entry: LogEntry<any>) {
    this.entries.push(entry);
    this.rerender(<App entries={this.entries} />);
  }

  summarize(schedulerRunSummary: SchedulerRunSummary) {}
}
