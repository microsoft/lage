import { Reporter } from "./Reporter";
import { LogEntry } from "../LogEntry";
import { LogLevel } from "../LogLevel";
import { RunContext } from "../../types/RunContext";
import { hrToSeconds } from "./formatDuration";

export class JsonReporter implements Reporter {
  constructor(private options: { logLevel: LogLevel }) {}

  log(entry: LogEntry) {
    if (this.options.logLevel >= entry.level) {
      console.log(JSON.stringify(entry));
    }
  }

  summarize(context: RunContext) {
    const { measures, tasks } = context;
    const summary: any = {};
    const taskStats: any[] = [];

    for (const task of tasks.values()) {
      taskStats.push({
        package: task.info.name,
        task: task.task,
        duration: hrToSeconds(task.duration),
        status: task.status,
        npmArgs: task.npmArgs,
      });
    }

    if (measures.failedTask) {
      summary.failedTask = measures.failedTask;
    }

    summary.duration = hrToSeconds(measures.duration);
    summary.taskStats = taskStats;

    console.log(JSON.stringify({ summary }));
  }
}
