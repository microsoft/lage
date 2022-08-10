import { getPackageAndTask } from "@lage-run/target-graph";
import type { Reporter, LogEntry } from "@lage-run/logger";
import type { TargetRunContext, TargetScheduler } from "@lage-run/scheduler";
export class AdoReporter implements Reporter {
  private logEntries = new Map<string, LogEntry[]>();

  log(entry: LogEntry<any>) {
    if (entry.data.target) {
      if (!this.logEntries.has(entry.data.target.id)) {
        this.logEntries.set(entry.data.target.id, []);
      }

      this.logEntries.get(entry.data.target.id)!.push(entry);
    }
  }

  summarize(runContexts: Map<string, TargetRunContext>) {
    const failedTargets = [...runContexts.values()].filter(({ status }) => status === "failed");

    if (failedTargets && failedTargets.length > 0) {
      const failedPackages: { packageName?: string; taskLogs?: string; task: string }[] = [];

      for (const failedTargetRun of failedTargets) {
        const failedTargetId = failedTargetRun.target.id;
        const { packageName, task } = getPackageAndTask(failedTargetId);
        const taskLogs = this.logEntries.get(failedTargetId);
        let packageLogs = ``;
        if (taskLogs) {
          packageLogs += `[${packageName} ${task}]`;
          for (let i = 0; i < taskLogs.length; i += 1) {
            packageLogs += taskLogs[i].msg.replace("\n", "");
          }
        }
        failedPackages.push({ packageName, taskLogs: packageLogs, task });
      }

      const logGroup: string[] = [];
      let packagesMessage = `##vso[task.logissue type=error]Your build failed on the following packages => `;
      failedPackages.forEach(({ packageName, task, taskLogs }) => {
        packagesMessage += `[${packageName} ${task}], `;
        if (taskLogs) {
          logGroup.push(taskLogs);
        }
      });
      packagesMessage += "find the error logs above with the prefix 'ERR!'";
      console.log(packagesMessage);

      console.log(`##vso[task.logissue type=warning]${logGroup.join(" | ")}`);
    }
  }
}
