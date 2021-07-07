import Queue from 'bee-queue';

const queueId = `lage:npm-task:${process.env.LAGE_WORKER_QUEUE_ID || 'default'}`;
export const workerQueue = new Queue(queueId);
