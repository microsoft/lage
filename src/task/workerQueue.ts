import Queue from "bee-queue";
import redis, { ClientOpts } from 'redis';
import { Config } from "../types/Config";

export const workerQueueId = `lage:npm-task:${process.env.LAGE_WORKER_QUEUE_ID || "default"}`;

export let workerQueue: Queue;

export const initWorkerQueue = async(config: Config["workerQueueOptions"], isWorker: boolean = true) => {
  const redisClient = redis.createClient(config.redis as ClientOpts);

  workerQueue = new Queue(workerQueueId, { ...config, isWorker });
  if (!isWorker) {
    await workerQueue.destroy();
  }

  return {workerQueue, redisClient};
};

export const workerPubSubChannel = `lage_pubsub_${process.env.LAGE_WORKER_QUEUE_ID || "default"}`