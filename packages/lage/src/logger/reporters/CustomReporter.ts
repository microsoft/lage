import { RunContext } from "../../types/RunContext";
import { Reporter } from "./Reporter";
import path from "path";

export class CustomReporter implements Reporter {
  constructor(private customReporterFilePath: string) {}

  log() {}

  summarize(context: RunContext) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const customReporter = require(path.isAbsolute(this.customReporterFilePath)
        ? this.customReporterFilePath
        : path.join(process.cwd(), this.customReporterFilePath));
      customReporter.summarize(context);
    } catch (e) {
      // ignore
    }
  }
}
