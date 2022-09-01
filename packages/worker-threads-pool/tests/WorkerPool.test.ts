import { WorkerPool } from "../src/WorkerPool";
import path from "node:path";

describe("WorkerPool", () => {
  it("should be able to process multiple tasks in parallel", async () => {
    const pool = new WorkerPool({
      maxWorkers: 5,
      script: path.resolve(__dirname, "fixtures", "my-worker.js"),
      workerOptions: {
        stdout: true,
      },
    });

    const running: any[] = [];

    const numTasks = 100;

    pool.on("running", (data) => {
      running.push(data);
    });

    const range = Array(numTasks)
      .fill(0)
      .map((_, i) => i);
    const results = await Promise.all(range.map((i) => pool.exec({ id: i })));

    expect(pool.workers.length).toBe(5);

    pool.close();

    expect(running.length).toBe(numTasks);
    expect(results.length).toBe(numTasks);
  });

  it("should be able to able to complete processes even when they are returning bad results", async () => {
    const pool = new WorkerPool({
      maxWorkers: 5,
      script: path.resolve(__dirname, "fixtures", "my-bad-worker.js"),
      workerOptions: {
        stdout: true,
      },
    });

    const running: any[] = [];

    const numTasks = 100;

    pool.on("running", (data) => {
      running.push(data);
    });

    const range = Array(numTasks)
      .fill(0)
      .map((_, i) => i);

    let results: any[] = [];

    try {
      results = await Promise.all(range.map((i) => pool.exec({ id: i }).catch(() => {})));
    } finally {
      pool.close();
    }
    expect(pool.workers.length).toBe(5);

    expect(running.length).toBe(numTasks);
    expect(results.length).toBe(numTasks);
  });
});
