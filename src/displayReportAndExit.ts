import { RunContext } from "./types/RunContext";
import { reportSummary } from "./logger/reportSummary";

export function displayReportAndExit(context: RunContext) {
  context.measures.duration = process.hrtime(context.measures.start);
  reportSummary(context);
  if (context.measures.failedTask) {
    process.exit(1);
  }
}
