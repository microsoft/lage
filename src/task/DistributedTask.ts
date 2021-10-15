import { TaskLogger } from "../logger/TaskLogger";
import { Config } from "../types/Config";
import { cacheFetch } from "../cache/backfill";
import { getQueueEvents, Queue } from "./workerQueue";

interface JobResults {
  hash: string;
  id: string;
  cwd: string;
  outputGlob: string[];
}

export class DistributedTask {
  constructor(
    public id: string,
    private cwd: string,
    private config: Config,
    private workerQueue: Queue,
    private logger: TaskLogger
  ) {}

  async getRemoteCache(remoteJobResults: JobResults) {
    if (!remoteJobResults) {
      return;
    }

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

    return new Promise<void>(async (resolve, reject) => {
      const queueEvents = getQueueEvents();

      if (!!this.workerQueue.closing) {
        return;
      }
      const job = await this.workerQueue.add(id, {});

      const completeHandler = async ({ jobId, returnvalue }: { jobId: string; returnvalue: JobResults }) => {
        if (job.id === jobId) {
          queueEvents.off("completed", completeHandler);
          queueEvents.off("failed", failedHandler);
          await this.getRemoteCache({ ...returnvalue, cwd: this.cwd });
          resolve();
        }
      };

      const failedHandler: (args: { jobId: string; failedReason: string }) => void = ({ jobId, failedReason }) => {
        if (job.id === jobId) {
          queueEvents.off("completed", completeHandler);
          queueEvents.off("failed", failedHandler);
          logger.error(failedReason);
          reject();
        }
      };

      queueEvents.on("completed", completeHandler);
      queueEvents.on("failed", failedHandler);
    });
  }
}
