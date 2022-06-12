import { Queue, Worker, QueueOptions, QueueEvents, Processor } from "bullmq";
import { EventEmitter } from "events";
import IORedis, { Redis, RedisOptions } from "ioredis";
import { logger } from "../logger";
import { Config } from "../types/Config";

const workerQueueId = `lage:${process.env.LAGE_WORKER_QUEUE_ID || "default"}`;
const workerPubSubChannel = `lage_pubsub_${
  process.env.LAGE_WORKER_QUEUE_ID || "default"
}`;

export type WorkerQueueProcessor = (job: WorkerQueueJob) => Promise<any>;

export interface WorkerQueueJob {
  name: string;
  id: string;
}

export class WorkerQueue {
  private coordinatorRedis: Redis;
  private workerQueue: Queue | undefined;
  private worker: Worker | undefined;
  private queueEvents: QueueEvents | undefined;
  private mode: "worker" | "master" | undefined;

  constructor(
    private config: Pick<Config, "workerQueueOptions" | "concurrency">
  ) {
    const redisOptions = config.workerQueueOptions.connection as RedisOptions;
    this.coordinatorRedis = new IORedis(redisOptions);
  }

  async initializeAsWorker(
    workerQueueProcessor: WorkerQueueProcessor
  ): Promise<Worker> {
    if (this.mode) {
      throw new Error(`WorkerQueue already initialized as ${this.mode}!`);
    }

    this.mode = "worker";

    const { config } = this;

    // Convert the simpler workerQueueProcessor to a full-fledged bullmq processor
    const processor = workerQueueProcessor as Processor;

    this.worker = new Worker(workerQueueId, processor, {
      connection: config.workerQueueOptions.connection,
      sharedConnection: true,
      concurrency: config.concurrency,
    });

    const pubSubListener = async (channel, message) => {
      if (workerPubSubChannel === channel) {
        if (message === "done") {
          await this.worker!.close(true);
          await this.worker!.disconnect();

          this.coordinatorRedis.off("message", pubSubListener);

          await this.coordinatorRedis.unsubscribe(workerPubSubChannel);
          await this.coordinatorRedis.quit();
          this.coordinatorRedis.disconnect();
        }
      }
    };

    await this.coordinatorRedis.subscribe(workerPubSubChannel);
    this.coordinatorRedis.on("message", pubSubListener);
    await this.worker.waitUntilReady();
    return this.worker;
  }

  async initializeAsMaster(maxTargets: number = 500) {
    if (this.mode) {
      throw new Error(`WorkerQueue already initialized as ${this.mode}!`);
    }

    this.mode = "master";

    const { config } = this;

    if (!this.workerQueue) {
      logger.verbose("[dist] creating work queue ");
      this.workerQueue = new Queue(workerQueueId, {
        ...config.workerQueueOptions,
      } as QueueOptions);
      logger.verbose("[dist] clearing work queue");

      await this.workerQueue.drain(false);
      await this.workerQueue.clean(0, 3000);

      await this.workerQueue.waitUntilReady();

      this.queueEvents = new QueueEvents(workerQueueId);
      this.queueEvents.setMaxListeners(maxTargets);

      logger.verbose("[dist] work queue ready");
    }

    return this.workerQueue;
  }

  async addJob(id: string, jobData?: any): Promise<EventEmitter | undefined> {
    if (this.workerQueue && this.queueEvents) {
      const job = await this.workerQueue.add(id, jobData ?? {});

      const emitter = new EventEmitter();

      const completeHandler = async ({
        jobId,
        returnvalue,
      }: {
        jobId: string;
        returnvalue: any;
      }) => {
        if (job.id === jobId) {
          this.queueEvents!.off("completed", completeHandler);
          this.queueEvents!.off("failed", failedHandler);
          emitter.emit("completed", { jobId, returnvalue });
        }
      };

      const failedHandler: (args: {
        jobId: string;
        failedReason: string;
      }) => void = ({ jobId, failedReason }) => {
        if (job.id === jobId) {
          this.queueEvents!.off("completed", completeHandler);
          this.queueEvents!.off("failed", failedHandler);
          emitter.emit("failed", { jobId, failedReason });
        }
      };

      this.queueEvents.on("completed", completeHandler);
      this.queueEvents.on("failed", failedHandler);

      return emitter;
    }
  }

  async closing() {
    return await this.workerQueue?.closing;
  }

  async close() {
    if (this.coordinatorRedis) {
      await this.coordinatorRedis.publish(workerPubSubChannel, "done");
      await this.coordinatorRedis.quit();
      this.coordinatorRedis.disconnect();
    }

    if (this.workerQueue) {
      await this.workerQueue.drain(false);
      await this.workerQueue.close();
      await this.workerQueue.disconnect();
    }

    if (this.queueEvents) {
      await this.queueEvents.close();
    }

    logger.verbose("[dist] closed work queue");
  }
}
