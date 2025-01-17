import type { QueueItem } from "./types/WorkerQueue.js";

/** Finds the index of an available task from the queue to run. Returns -1 if there are no eligible tasks */
export function pickTaskFromQueue(queue: QueueItem[], availability: number) {
  // A key assumption here is that items are inserted into the queue in priority order
  let maxPrioritySeenSoFar: number | undefined;
  for (let i = 0; i < queue.length; i++) {
    const candidateTask = queue[i];

    if (candidateTask.weight <= availability) {
      // If we have enough availability and there have been no higher priority tasks before this one, we can execute this task;
      if (maxPrioritySeenSoFar === undefined || candidateTask.priority === maxPrioritySeenSoFar) {
        return i;
      }

      return -1;
    }

    if (candidateTask.priority) {
      maxPrioritySeenSoFar =
        maxPrioritySeenSoFar !== undefined ? Math.max(maxPrioritySeenSoFar, candidateTask.priority) : candidateTask.priority;
    }
  }

  return -1;
}
