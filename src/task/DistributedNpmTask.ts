import { TaskLogger } from "../logger/TaskLogger";
import Queue from "bee-queue";
import { PackageInfo } from "workspace-tools";
import { Config } from "../types/Config";
import { getTargetId } from "./taskId";

export class DistributedNpmTask {
  constructor(
    public task: string,
    public info: PackageInfo,
    private config: Config,
    private workerQueue: Queue,
    private logger: TaskLogger
  ) {}

  async run() {
    const { task, info, logger } = this;

    return new Promise<void>((resolve, reject) => {
      const job = this.workerQueue.createJob({
        id: getTargetId(info.name, task),
      });

      job.on("succeeded", (result) => {
        logger.info("succeeded");
        resolve();
      });

      job.on("failed", (result) => {
        logger.info("failed");
        reject();
      });

      // time out defaults to 1 hour
      const timeout = !!this.config?.workerQueueOptions?.timeoutSeconds
        ? this.config.workerQueueOptions.timeoutSeconds * 1000
        : 1000 * 60 * 60;
        
      job
        .timeout(timeout)
        .save()
        .then((newJob) => {
          logger.info(`job id: ${newJob.id}`);
        });
    });
  }
}
