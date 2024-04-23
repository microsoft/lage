import { Reporter } from "./Reporter";
import { LogEntry } from "../LogEntry";
import { LogLevel } from "../LogLevel";
import { RunContext } from "../../types/RunContext";
import { hrToSeconds } from "./formatDuration";

export class JsonReporter implements Reporter {
  constructor(private options: { logLevel: LogLevel }) {}

  log(entry: LogEntry) {
    if (this.options.logLevel >= entry.level) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(entry));
    }
  }

  summarize(context: RunContext) {
    const { measures, targets } = context;
    const summary: any = {};
    const taskStats: any[] = [];

    for (const wrappedTarget of targets.values()) {
      taskStats.push({
        package: wrappedTarget.target.packageName,
        task: wrappedTarget.target.task,
        duration: hrToSeconds(wrappedTarget.duration),
        status: wrappedTarget.status,
      });
    }

    if (measures.failedTargets && measures.failedTargets.length > 0) {
      summary.failedTargets = measures.failedTargets;
    }

    summary.duration = hrToSeconds(measures.duration);
    summary.taskStats = taskStats;

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ summary }));
  }
}
