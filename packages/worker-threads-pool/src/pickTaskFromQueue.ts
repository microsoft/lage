import type { QueueItem } from "./types/WorkerQueue.js";

function isBetterCandidateThanCurrent(current: QueueItem | undefined, candidate: QueueItem): boolean {
  // If we don't have any current candidates, the new candidate is better by definition
  if (!current) {
    return true;
  }

  // If the new candidate has a higher priority than the current candidate, it is better
  if (candidate.priority && (current.priority == undefined || candidate.priority > current.priority)) {
    return true;
  }

  // Otherwise stick with the current candidate
  return false;
}

/**
 * Finds the index of an available task from the queue to run.
 * A task is eligible if it has a weight less than or equal to the availability and there are no other tasks with higher priority.
 * There are no eligible tasks when the queue is empty, there is no availability, there are no tasks with a weight lower than the availability, or the tasks with the highest priority have a weight higher than the availability.
 * @returns the index of the task to run or -1 if no eligible task is available.
 */
export function pickTaskFromQueue(queue: QueueItem[], availability: number): number {
  let maxPrioritySeenSoFar: undefined | number = undefined;
  let bestCandidateTask: undefined | { queueItem: QueueItem; index: number } = undefined;
  for (let i = 0; i < queue.length; i++) {
    const taskToConsider = queue[i];

    // A task is not a candidate if there is not enough availability to run it
    if (taskToConsider.weight <= availability) {
      // If we have enough availability and there have been no higher priority tasks before this one, we can execute this task;
      if (isBetterCandidateThanCurrent(bestCandidateTask?.queueItem, taskToConsider)) {
        bestCandidateTask = { queueItem: taskToConsider, index: i };
      }
    }

    if (taskToConsider.priority !== undefined) {
      maxPrioritySeenSoFar =
        maxPrioritySeenSoFar !== undefined ? Math.max(maxPrioritySeenSoFar, taskToConsider.priority) : taskToConsider.priority;
    }
  }

  // Confirm the candidate task has a priority equal to the highest priority seen across all tasks
  if (bestCandidateTask && (maxPrioritySeenSoFar === undefined || bestCandidateTask.queueItem.priority === maxPrioritySeenSoFar)) {
    return bestCandidateTask.index;
  }

  return -1;
}
