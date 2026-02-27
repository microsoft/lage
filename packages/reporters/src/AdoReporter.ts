import { formatDuration, hrToSeconds } from "@lage-run/format-hrtime";
import chalk from "chalk";
import type { TargetRun } from "@lage-run/scheduler-types";
import { colors, GroupedReporter } from "./GroupedReporter.js";

export class AdoReporter extends GroupedReporter {
  protected formatGroupStart(packageName: string, task: string, status: string, duration?: [number, number]): string {
    return `##[group] ${colors.pkg(packageName)} ${colors.task(task)} ${status}${
      duration ? `, took ${formatDuration(hrToSeconds(duration))}` : ""
    }\n`;
  }

  protected formatGroupEnd(): string {
    return `##[endgroup]\n`;
  }

  protected writeSummaryHeader(): void {
    this.logStream.write(chalk.cyanBright(`##[section]Summary\n`));
  }

  protected writeSummaryFooter(): void {
    // ADO sections have no closing marker
  }

  protected writeFailures(failed: string[], targetRuns: Map<string, TargetRun<unknown>>): void {
    let packagesMessage = `##vso[task.logissue type=error]Your build failed on the following packages => `;

    for (const targetId of failed) {
      const target = targetRuns.get(targetId)?.target;

      if (target) {
        const { packageName, task } = target;
        const taskLogs = this.logEntries.get(targetId);

        packagesMessage += `[${packageName} ${task}], `;

        this.logStream.write(`##[error] [${chalk.magenta(packageName)} ${chalk.cyan(task)}] ${chalk.redBright("ERROR DETECTED")}\n`);

        if (taskLogs) {
          for (const entry of taskLogs) {
            // Log each entry separately to prevent truncation
            this.logStream.write(`##[error] ${entry.msg}\n`);
          }
        }
      }
    }

    packagesMessage += "find the error logs above with the prefix '##[error]!'\n";
    this.logStream.write(packagesMessage);
  }
}
