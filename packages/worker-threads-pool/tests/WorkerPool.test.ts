import { WorkerPool } from "../src/WorkerPool";
import path from "path";
import { Readable } from "stream";

describe("WorkerPool", () => {
  it("should be able to process multiple tasks in parallel", async () => {
    const pool = new WorkerPool({
      maxWorkers: 5,
      script: path.resolve(__dirname, "fixtures", "my-worker.js"),
    });

    const running: any[] = [];

    const numTasks = 100;

    const setup = (data) => {
      running.push(data);
    };

    const range = Array(numTasks)
      .fill(0)
      .map((_, i) => i);
    const results = await Promise.all(range.map((i) => pool.exec({ id: i }, setup)));

    expect(pool.workers.length).toBe(5);

    pool.close();

    expect(running.length).toBe(numTasks);
    expect(results.length).toBe(numTasks);
  });

  it("should be able to able to complete processes even when they are returning bad results", async () => {
    const pool = new WorkerPool({
      maxWorkers: 5,
      script: path.resolve(__dirname, "fixtures", "my-bad-worker.js"),
    });

    const running: any[] = [];

    const numTasks = 100;

    const setup = (data) => {
      running.push(data);
    };

    const range = Array(numTasks)
      .fill(0)
      .map((_, i) => i);

    let results: any[] = [];

    try {
      results = await Promise.all(range.map((i) => pool.exec({ id: i }, setup).catch(() => {})));
    } finally {
      pool.close();
    }
    expect(pool.workers.length).toBe(5);

    expect(running.length).toBe(numTasks);
    expect(results.length).toBe(numTasks);
  });

  it("should give the setup() a worker and a set of stdio streams", async () => {
    const pool = new WorkerPool({
      maxWorkers: 5,
      script: path.resolve(__dirname, "fixtures", "my-worker.js"),
    });

    const setup = jest.fn();

    await pool.exec({ id: 1 }, setup);

    expect(setup).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledWith(expect.anything(), expect.any(Readable), expect.any(Readable));

    pool.close();
  });
});
