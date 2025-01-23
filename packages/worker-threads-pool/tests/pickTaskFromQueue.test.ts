import { pickTaskFromQueue } from "../src/pickTaskFromQueue";
import type { QueueItem } from "../src/types/WorkerQueue";

function createMockQueueItem(partialProps: Partial<QueueItem>): QueueItem {
  return { task: {}, weight: 1, resolve: jest.fn(), reject: jest.fn(), ...partialProps };
}

describe("pickTaskFromQueue tests", () => {
  it("should return -1 if there are no tasks", () => {
    expect(pickTaskFromQueue([], 1)).toEqual(-1);
  });

  it("should return -1 if there is no availability", () => {
    expect(pickTaskFromQueue([createMockQueueItem({ weight: 1 })], 0)).toEqual(-1);
  });

  it("should return the first task that fits the availability and there are no priorities", () => {
    expect(pickTaskFromQueue([createMockQueueItem({ weight: 1 })], 1)).toEqual(0);
    expect(pickTaskFromQueue([createMockQueueItem({ weight: 2 }), createMockQueueItem({ weight: 1 })], 1)).toEqual(1);
  });

  it("should not schedule a task with lower priority before one with a higher priority", () => {
    expect(pickTaskFromQueue([createMockQueueItem({ weight: 2, priority: 100 }), createMockQueueItem({ weight: 1 })], 1)).toEqual(-1);
    expect(
      pickTaskFromQueue([createMockQueueItem({ weight: 2, priority: 100 }), createMockQueueItem({ weight: 1, priority: 80 })], 1)
    ).toEqual(-1);
    expect(
      pickTaskFromQueue([createMockQueueItem({ weight: 1, priority: 80 }), createMockQueueItem({ weight: 1, priority: 100 })], 1)
    ).toEqual(1);
    expect(pickTaskFromQueue([createMockQueueItem({ weight: 1 }), createMockQueueItem({ weight: 1, priority: 100 })], 1)).toEqual(1);
  });

  it("should handle tasks with equal priority correctly", () => {
    expect(
      pickTaskFromQueue([createMockQueueItem({ weight: 2, priority: 100 }), createMockQueueItem({ weight: 1, priority: 100 })], 1)
    ).toEqual(1);
  });
});
