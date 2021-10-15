import { Queue, Worker, QueueOptions, QueueEvents, Processor } from "bullmq";
import IORedis, { Redis, RedisOptions } from "ioredis";
import { logger } from "../logger";
import { Config } from "../types/Config";

export const workerQueueId = `lage:${process.env.LAGE_WORKER_QUEUE_ID || "default"}`;
export const workerPubSubChannel = `lage_pubsub_${process.env.LAGE_WORKER_QUEUE_ID || "default"}`;

let coordinatorRedis: Redis;
let workerQueue: Queue;

export async function initWorkerQueueAsWorker(processor: Processor, config: Config) {
  const redisOptions = config.workerQueueOptions.connection as RedisOptions;
  coordinatorRedis = new IORedis(redisOptions);

  const worker = new Worker(workerQueueId, processor, {
    connection: config.workerQueueOptions.connection,
    sharedConnection: true,
    concurrency: config.concurrency,
  });

  const pubSubListener = async (channel, message) => {
    if (workerPubSubChannel === channel) {
      if (message === "done") {
        await worker.close(true);
        await worker.disconnect();

        coordinatorRedis.off("message", pubSubListener);
        
        await coordinatorRedis.unsubscribe(workerPubSubChannel);
        await coordinatorRedis.quit();
        await coordinatorRedis.disconnect();
      }
    }
  };

  await coordinatorRedis.subscribe(workerPubSubChannel);
  coordinatorRedis.on("message", pubSubListener);

  await worker.waitUntilReady();

  return worker;
}

export async function initWorkerQueueAsMaster(config: Config) {
  if (!workerQueue) {
    logger.verbose("[dist] worker queue");
    const redisOptions = config.workerQueueOptions.connection as RedisOptions;
    coordinatorRedis = new IORedis(redisOptions);

    workerQueue = new Queue(workerQueueId, { ...config.workerQueueOptions } as QueueOptions);

    logger.verbose("[dist] clearing work queue");
    await workerQueue.drain(false);

    await workerQueue.waitUntilReady();

    logger.verbose("[dist] work queue ready");
  }

  return workerQueue;
}

export async function closeWorkerQueue() {
  if (workerQueue) {
    await coordinatorRedis.publish(workerPubSubChannel, "done");
    await coordinatorRedis.quit();
    await coordinatorRedis.disconnect();

    await workerQueue.drain(false);
    await workerQueue.close();
    await workerQueue.disconnect();
    await getQueueEvents().close();

    logger.verbose("[dist] closed work queue");
  }
}

let queueEvents: QueueEvents;
export function getQueueEvents() {
  if (!queueEvents) {
    queueEvents = new QueueEvents(workerQueueId);
  }

  return queueEvents;
}

export { Queue };
