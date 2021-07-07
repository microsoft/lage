import Queue from "bee-queue";
import { Config } from "../types/Config";

const queueId = `lage:npm-task:${process.env.LAGE_WORKER_QUEUE_ID || "default"}`;

export let workerQueue: Queue;

export const initWorkerQueue = (config: Config["workerQueueOptions"], isWorker: boolean = true) => {
  workerQueue = new Queue(queueId, { ...config, isWorker });
  return workerQueue;
};
