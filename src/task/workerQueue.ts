import Queue from "bee-queue";
import redis, { ClientOpts } from "redis";
import { Config } from "../types/Config";

export const workerQueueId = `lage:npm-task:${process.env.LAGE_WORKER_QUEUE_ID || "default"}`;
export const workerPubSubChannel = `lage_pubsub_${process.env.LAGE_WORKER_QUEUE_ID || "default"}`;

let redisClient: redis.RedisClient;
let workerQueue: Queue;

export async function initWorkerQueueAsWorker(config: Config) {
  if (!workerQueue) {
    redisClient = redis.createClient(config.workerQueueOptions.redis as ClientOpts);
    workerQueue = new Queue(workerQueueId, { ...config.workerQueueOptions, isWorker: true });

    const pubSubListener = (channel, message) => {
      if (workerPubSubChannel === channel) {
        if (message === "done") {
          workerQueue.close();
          redisClient.off("message", pubSubListener);
          redisClient.unsubscribe(workerPubSubChannel);
          redisClient.quit();
        }
      }
    };

    redisClient.subscribe(workerPubSubChannel);
    redisClient.on("message", pubSubListener);
  }

  return workerQueue;
}

export async function initWorkerQueueAsMaster(config: Config) {
  if (!workerQueue) {


    redisClient = redis.createClient(config.workerQueueOptions.redis as ClientOpts);

    workerQueue = new Queue(workerQueueId, { ...config.workerQueueOptions, isWorker: false });
    await workerQueue.destroy();
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
