import { Reporter } from "./Reporter";
import { LogEntry } from "../LogEntry";
import { LogLevel } from "../LogLevel";
import { RunContext } from "../../types/RunContext";

export class JsonReporter implements Reporter {
  constructor(private options: { logLevel: LogLevel }) {}

  log(entry: LogEntry) {
    if (this.options.logLevel >= entry.level) {
      console.log(JSON.stringify(entry));
    }
  }

  summarize(context: RunContext) {
    console.log(JSON.stringify({ summary: context.measures }));
  }
}
