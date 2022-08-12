import { RunContext } from "./types/RunContext";
import { Reporter } from "./logger/reporters/Reporter";

export function displayReportAndExit(reporters: Reporter[], context: RunContext) {
  context.measures.duration = process.hrtime(context.measures.start);

  for (const reporter of reporters) {
    reporter.summarize(context);
  }

  if (context.measures.failedTargets && context.measures.failedTargets.length > 0) {
    process.exit(1);
  }
}
