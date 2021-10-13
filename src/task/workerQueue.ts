import Queue from "bee-queue";
import redis, { ClientOpts } from "redis";
import { Config } from "../types/Config";

export const workerQueueId = `lage:npm-task:${process.env.LAGE_WORKER_QUEUE_ID || "default"}`;
export const workerPubSubChannel = `lage_pubsub_${process.env.LAGE_WORKER_QUEUE_ID || "default"}`;

let redisClient: redis.RedisClient;
let workerQueue: Queue;

export async function initWorkerQueue(config: Config, isWorker: boolean = true) {
  if (!workerQueue) {
    redisClient = redis.createClient(config.workerQueueOptions.redis as ClientOpts);
    workerQueue = new Queue(workerQueueId, { ...config, isWorker });

    if (!isWorker) {
      await workerQueue.destroy();
    }
  }

  return workerQueue;
}

export function closeWorkerQueue() {
  if (redisClient) {
    redisClient.publish(workerPubSubChannel, "done");
    redisClient.quit();
  }

  if (workerQueue) {
    workerQueue.close();
  }
}
