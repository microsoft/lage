import { Logger } from "@lage-run/logger";
import path from "path";
import { AggregatedPool } from "../src/AggregatedPool";

describe("AggregatedPool", () => {
  it("should create multiple workerpools for defined groups", async () => {
    const pool = new AggregatedPool({
      groupBy: (data: any) => data.group,
      logger: new Logger(),
      maxWorkers: 10,
      maxWorkersByGroup: new Map([
        ["group1", 5],
        ["group2", 5],
      ]),
      script: path.join(__dirname, "fixtures", "my-worker.js"),
      workerOptions: {},
    });

    const group1Pool = pool.groupedPools.get("group1");
    const group2Pool = pool.groupedPools.get("group2");

    expect(group1Pool).toBeTruthy();
    expect(group2Pool).toBeTruthy();
    expect(group1Pool).not.toBe(group2Pool);
    expect(group1Pool?.maxWorkers).toBe(5);
    expect(group2Pool?.maxWorkers).toBe(5);

    expect(pool.defaultPool).toBeUndefined();

    await pool.close();
  });

  it("should create multiple workerpools for defined groups, with default pool available", async () => {
    const pool = new AggregatedPool({
      groupBy: (data: any) => data.group,
      logger: new Logger(),
      maxWorkers: 10,
      maxWorkersByGroup: new Map([
        ["group1", 2],
        ["group2", 3],
      ]),
      script: path.join(__dirname, "fixtures", "my-worker.js"),
      workerOptions: {},
    });

    const group1Pool = pool.groupedPools.get("group1");
    const group2Pool = pool.groupedPools.get("group2");

    expect(group1Pool).toBeTruthy();
    expect(group2Pool).toBeTruthy();
    expect(group1Pool).not.toBe(group2Pool);

    expect(group1Pool?.maxWorkers).toBe(2);
    expect(group2Pool?.maxWorkers).toBe(3);

    expect(pool.defaultPool).toBeTruthy();
    expect(pool.defaultPool?.maxWorkers).toBe(5);

    await pool.close();
  });
});
