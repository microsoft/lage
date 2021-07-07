import Queue from "bee-queue";
import { worker } from "../command/worker";
import { Config } from "../types/Config";

const queueId = `lage:npm-task:${process.env.LAGE_WORKER_QUEUE_ID || "default"}`;

let workerQueue: Queue;

export const getWorkerQueue = (config: Config["workerQueueOptions"], isWorker: boolean = true) => {
  if (!workerQueue) {
    workerQueue = new Queue(queueId, { ...config, isWorker });
  }

  return workerQueue;
};
