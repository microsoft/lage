import { TaskLogger } from "../logger/TaskLogger";
import Queue from "bee-queue";
import { Config } from "../types/Config";
import { cacheFetch, cacheHash } from "../cache/backfill";

interface JobResults {
  hash: string;
  id: string;
  cwd: string;
  outputGlob: string[];
}

export class DistributedTask {
  constructor(public id: string, private config: Config, private workerQueue: Queue, private logger: TaskLogger) {}

  async getRemoteCache(remoteJobResults: JobResults) {
    const { hash, id, cwd, outputGlob } = remoteJobResults;

    if (hash && id && cwd) {
      const cacheOptions = {
        ...this.config.cacheOptions,
        outputGlob: outputGlob || this.config.cacheOptions.outputGlob,
      };
      await cacheFetch(hash, id, cwd, cacheOptions);
    }
  }

  async run() {
    const { id, logger } = this;

    return new Promise<void>((resolve, reject) => {
      const job = this.workerQueue.createJob({
        id,
      });

      job.on("succeeded", async (results: JobResults) => {
        if (results && results.hash) {
          try {
            await this.getRemoteCache(results);
          } catch (e) {
            logger.error(e as any);
            reject(e);
          }
        }

        resolve();
      });

      job.on("failed", (e: Error) => {
        logger.error(e.message);
        reject(e);
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
