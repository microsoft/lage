import { RunContext } from "../../types/RunContext";
import { Reporter } from "./Reporter";
import { LogEntry } from "../LogEntry";
import path from "path";

export class CustomReporter implements Reporter {
  constructor(private customReporterFilePath: string) {}

  log(entry: LogEntry) {}

  summarize(context: RunContext) {
    try {
      const customReporter = require(path.isAbsolute(this.customReporterFilePath)
        ? this.customReporterFilePath
        : path.join(process.cwd(), this.customReporterFilePath));
      customReporter.summarize(context);
    } catch (e) {}
  }
}
