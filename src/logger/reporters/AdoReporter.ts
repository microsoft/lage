import { RunContext } from '../../types/RunContext';
import { Reporter } from './Reporter';
import { LogEntry } from '../LogEntry';
import { getTaskId } from '@microsoft/task-scheduler';

export class AdoReporter implements Reporter {

  // not being used since the npm logger is used in its place
  log(entry: LogEntry) { }

  summarize(context: RunContext) {
    const { measures, tasks } = context;
    const removeColorCodes = new RegExp('\\x1B\[[0-9;]*[A-Za-z]', 'g');

    if (measures.failedTasks && measures.failedTasks.length > 0) {
      const failedPackages: { pkg?: string; taskLogs?: string; task: string; }[] = [];

      for (const failedTask of measures.failedTasks) {
        const { pkg, task } = failedTask;
        const taskId = getTaskId(pkg, task);
        const taskLogs = tasks.get(taskId)?.logger.getLogs();
        let packageLogs = '';

        if (taskLogs) {
          packageLogs += `[${pkg} ${task}] `;
          for (let i = 0; i < taskLogs.length; i += 1) {
            const _logLine = taskLogs[i].msg.replace(removeColorCodes, '').replace('\n', '');
            packageLogs += `${_logLine} `;
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
