import { TaskLogger } from "../logger/TaskLogger";
import { Config } from "../types/Config";
import { cacheFetch } from "../cache/backfill";
import { WorkerQueue } from "./WorkerQueue";

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
    private workerQueue: WorkerQueue,
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
      if (await this.workerQueue.closing()) {
        return;
      }

      const job = await this.workerQueue.addJob(id);

      if (job) {
        const completeHandler = async ({ jobId, returnvalue }: { jobId: string; returnvalue: JobResults }) => {
          job.off("completed", completeHandler);
          job.off("failed", failedHandler);
          await this.getRemoteCache({ ...returnvalue, cwd: this.cwd });
          resolve();
        };

        const failedHandler: (args: { jobId: string; failedReason: string }) => void = ({ jobId, failedReason }) => {
          job.off("completed", completeHandler);
          job.off("failed", failedHandler);
          logger.error(failedReason);
          reject();
        };

        job.on("completed", completeHandler);
        job.on("failed", failedHandler);
      }
    });
  }
}
