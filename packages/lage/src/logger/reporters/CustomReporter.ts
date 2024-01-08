import { RunContext } from "../../types/RunContext";
import { Reporter } from "./Reporter";
import { LogEntry } from "../LogEntry";
import path from "path";

export class CustomReporter implements Reporter {
  log(entry: LogEntry) {}

  summarize(context: RunContext) {
    try {
      const filePath = path.join(process.cwd(), "lage-custom-reporter.js");
      const customReporter = require(filePath);
      customReporter.summarize(context);
    } catch (e) {}
  }
}
