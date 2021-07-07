import Queue from "bee-queue";
import { Config } from "../types/Config";

const queueId = `lage:npm-task:${process.env.LAGE_WORKER_QUEUE_ID || "default"}`;

export const getWorkerQueue = (config: Config["workerQueueOptions"]) => new Queue(queueId, config);
