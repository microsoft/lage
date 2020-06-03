import { formatDuration } from "./formatDuration";
import { info, getTaskLogs } from "./index";
import { logger } from ".";
import { RunContext } from "../types/RunContext";
import chalk from "chalk";
import { getTaskId } from "../task/taskId";

function hr() {
  logger.info("----------------------------------------------");
}

export async function reportSummary(context: RunContext) {
  const { measures } = context;

  const taskLogs = getTaskLogs();

  const statusColorFn = {
    success: chalk.greenBright,
    failed: chalk.redBright,
    skipped: chalk.gray,
  };

  hr();

  logger.info(chalk.cyanBright(`🏗 Summary\n`));

  if (measures.failedTask) {
    const { pkg, task } = measures.failedTask;
    const taskId = getTaskId(pkg, task);

    logger.error(`ERROR DETECTED IN ${pkg} ${task}`);
    logger.error(taskLogs.get(taskId)!.join("\n"));

    hr();
  }

  if (measures.taskStats.length > 0) {
    for (const stats of measures.taskStats) {
      const colorFn = statusColorFn[stats.status];
      info(
        stats.taskId,
        colorFn(`${stats.status}, took ${formatDuration(stats.duration)}`)
      );
    }
  } else {
    logger.info("Nothing has been run.");
  }

  hr();

  logger.info(
    `Took a total of ${formatDuration(measures.duration)} to complete`
  );
}
