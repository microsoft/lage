import { getPackageAndTask } from "../../task/taskId";
import { RunContext } from "../../types/RunContext";
import { Reporter } from "./Reporter";

export class AdoReporter implements Reporter {
  log() {}

  summarize(context: RunContext) {
    const { measures, targets } = context;
    if (measures.failedTargets && measures.failedTargets.length > 0) {
      const failedPackages: { packageName?: string; taskLogs?: string; task: string }[] = [];

      for (const failedTargetId of measures.failedTargets) {
        const { packageName, task } = getPackageAndTask(failedTargetId);
        const taskLogs = targets.get(failedTargetId)?.logger.getLogs();
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
      // eslint-disable-next-line no-console
      console.log(packagesMessage);

      // eslint-disable-next-line no-console
      console.log(`##vso[task.logissue type=warning]${logGroup.join(" | ")}`);
    }
  }
}
