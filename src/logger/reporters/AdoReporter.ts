import { RunContext } from '../../types/RunContext';
import { Reporter } from './Reporter';
import { LogEntry } from '../LogEntry';
import { getTaskId } from '@microsoft/task-scheduler';

export class AdoReporter implements Reporter {

  log(entry: LogEntry) {}

  summarize(context: RunContext) {
    const { measures, tasks } = context;

    let packageLogs = '';
    if (measures.failedTasks && measures.failedTasks.length > 0) {
      const failedPackages: { pkg?: string; taskLogs?: string; task: string; }[] = [];

      for (const failedTask of measures.failedTasks) {
        const { pkg, task } = failedTask;
        const taskId = getTaskId(pkg, task);
        const taskLogs = tasks.get(taskId)?.logger.getLogs();

        if (taskLogs) {
          packageLogs += `[${pkg} ${task}]`;
          for (let i = 0; i < taskLogs.length; i += 1) {
            packageLogs += taskLogs[i].msg.replace('\n', '');
          }
        }

        failedPackages.push({ pkg, taskLogs: packageLogs, task });
      }

      const logGroup: string[] = [];
      let packagesMessage = `##vso[task.logissue type=error]Your build failed on the following packages => `;
      failedPackages.forEach(({ pkg, task, taskLogs }) => {
        packagesMessage += `[${pkg} ${task}], `;
        if (taskLogs) {
          logGroup.push(taskLogs);
        }
      });

      packagesMessage += "find the error logs above with the prefix 'ERR!'";
      console.log(packagesMessage);

      console.log(`##vso[task.logissue type=warning]${logGroup.join(' | ')}`);
    }
  }
}
