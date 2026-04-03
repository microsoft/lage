import { formatHrtime } from "./formatDuration.js";
import type { TargetRun } from "@lage-run/scheduler-types";
import { GroupedReporter } from "./GroupedReporter.js";

/**
 * Reporter that formats logs for GitHub Actions, optionally with grouping.
 */
export class GithubActionsReporter extends GroupedReporter {
  protected formatGroupStart(packageName: string, task: string, status: string, duration?: [number, number]): string {
    return `::group::${packageName} ${task} ${status}${duration ? `, took ${formatHrtime(duration)}` : ""}\n`;
  }

  protected formatGroupEnd(): string {
    return `::endgroup::\n`;
  }

  protected writeSummaryHeader(): void {
    this.logStream.write(`::group::Summary\n`);
  }

  protected writeSummaryFooter(): void {
    this.logStream.write(`::endgroup::\n`);
  }

  protected writeFailures(failed: string[], targetRuns: Map<string, TargetRun<unknown>>): void {
    for (const targetId of failed) {
      const target = targetRuns.get(targetId)?.target;

      if (target) {
        const { packageName, task } = target;
        const taskLogs = this.logEntries.get(targetId);

        this.logStream.write(`::error title=${packageName} ${task}::Build failed\n`);

        if (taskLogs) {
          for (const entry of taskLogs) {
            if (entry.msg.trim() !== "") {
              this.logStream.write(`::error::${entry.msg}\n`);
            }
          }
        }
      }
    }
  }
}
