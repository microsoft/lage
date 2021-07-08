import Queue from "bee-queue";
import { Config } from "../types/Config";

const queueId = `lage:npm-task:${process.env.LAGE_WORKER_QUEUE_ID || "default"}`;

export let workerQueue: Queue;

export const initWorkerQueue = async(config: Config["workerQueueOptions"], isWorker: boolean = true) => {
  workerQueue = new Queue(queueId, { ...config, isWorker });
  if (!isWorker) {
    await workerQueue.destroy();
  }

  return workerQueue;
};
