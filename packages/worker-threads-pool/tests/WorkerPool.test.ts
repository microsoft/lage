import path from "path";
import { Readable } from "stream";
import { WorkerPool } from "../src/WorkerPool.js";

describe("WorkerPool", () => {
  it("should be able to process multiple tasks in parallel", async () => {
    const pool = new WorkerPool({
      maxWorkers: 5,
      script: path.resolve(__dirname, "fixtures", "my-worker.js"),
    });

    const running: any[] = [];

    const numTasks = 100;

    const setup = (data: any) => {
      running.push(data);
    };

    const range = Array(numTasks)
      .fill(0)
      .map((_, i) => i);
    const results = await Promise.all(range.map((i) => pool.exec({ id: i }, 1, setup)));

    expect(pool.workers.length).toBe(5);

    await pool.close();

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

    const setup = (data: any) => {
      running.push(data);
    };

    const range = Array(numTasks)
      .fill(0)
      .map((_, i) => i);

    let results: any[] = [];

    try {
      results = await Promise.all(range.map((i) => pool.exec({ id: i }, 1, setup).catch(() => {})));
    } finally {
      await pool.close();
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

    await pool.exec({ id: 1 }, 1, setup);

    expect(setup).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledWith(expect.anything(), expect.any(Readable), expect.any(Readable));

    await pool.close();
  });

  it("take up the availability of a pool with a fully weighted worker", async () => {
    expect.hasAssertions();

    const pool = new WorkerPool({
      maxWorkers: 5,
      script: path.resolve(__dirname, "fixtures", "my-worker.js"),
    });

    const setup = () => {
      expect(pool.availability).toBe(0);
    };

    await pool.exec({ id: 1 }, 5, setup);
    await pool.close();
  });

  it("should restart workers when max worker memory limit is hit", async () => {
    const pool = new WorkerPool({
      maxWorkers: 1,
      script: path.resolve(__dirname, "fixtures", "my-5mb-worker.js"), // this worker will consume 5mb of memory each "exec"
      workerIdleMemoryLimit: 1024 * 1024 * 1, // 1MB
    });

    await pool.exec({ id: 1 }, 1);
    await pool.exec({ id: 2 }, 1);
    await pool.exec({ id: 3 }, 1);
    await pool.exec({ id: 4 }, 1);

    await pool.close();

    const stats = pool.stats();

    expect(stats.workerRestarts).toBe(3);
  });

  it("should not restart workers when memory is plenty, and reports the max memory to be portional to the 5mb worker", async () => {
    const pool = new WorkerPool({
      maxWorkers: 1,
      script: path.resolve(__dirname, "fixtures", "my-5mb-worker.js"), // this worker will consume 5mb of memory each "exec"
      workerIdleMemoryLimit: 1024 * 1024 * 150, // 1MB
    });

    await pool.exec({ id: 1 }, 1, (_worker, stdout, stderr) => {
      stdout.pipe(process.stdout);
      stderr.pipe(process.stderr);
    });
    await pool.exec({ id: 2 }, 1);
    await pool.exec({ id: 3 }, 1);
    await pool.exec({ id: 4 }, 1);

    await pool.close();

    const stats = pool.stats();

    expect(stats.workerRestarts).toBe(0);
    expect(stats.maxWorkerMemoryUsage).toBeGreaterThan(1024 * 1024 * 20); // 20mb
  });
});
