import { describe, expect, it } from "@jest/globals";
import { LogLevel } from "@lage-run/logger";
import type { TargetStatus } from "@lage-run/scheduler-types";
import { BasicReporter } from "../BasicReporter.js";
import type { TargetLogData, TargetMessageData, TargetStatusData } from "../types/TargetLogData.js";
import { statusColorFn } from "../LogReporter.js";
import { createTarget, createTargetRun } from "./helpers.js";
import { MemoryStream } from "./MemoryStream.js";

describe("BasicReporter", () => {
  it("records a target status entry", () => {
    const writer = new MemoryStream();
    const reporter = new BasicReporter({ logStream: writer });
    const target = createTarget("a", "task");
    const allStatuses = Object.keys(statusColorFn) as TargetStatus[];

    for (const status of allStatuses) {
      reporter.log({
        data: { target, status, duration: [10, 0], hash: "abc123" } satisfies TargetStatusData,
        level: LogLevel.verbose,
        msg: "test message",
        timestamp: 0,
      });
    }

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "lage - Version 0.0.0 - 0 Workers

      [12:34:56] ✓ success  a - task (10.00s)
      [12:34:56] Completed: 1/1 (100%) [0 running, 0 pending]
      [12:34:56] ✗ failed   a - task (10.00s)
      [12:34:56] Completed: 1/1 (100%) [0 running, 0 pending]
      [12:34:56] - skipped  a - task (10.00s)
      [12:34:56] Completed: 1/1 (100%) [0 running, 0 pending]
      [12:34:56] - aborted  a - task (10.00s)
      [12:34:56] Completed: 1/1 (100%) [0 running, 0 pending]"
    `);
  });

  it("records a target message entry", () => {
    const writer = new MemoryStream();
    const reporter = new BasicReporter({ logStream: writer });

    reporter.log({
      data: {
        target: createTarget("a", "task"),
        pid: 1,
      } satisfies TargetMessageData,
      level: LogLevel.verbose,
      msg: "test message",
      timestamp: 0,
    });

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "lage - Version 0.0.0 - 0 Workers
      "
    `);
  });

  it("interweave messages (grouping not supported)", () => {
    const writer = new MemoryStream();
    const reporter = new BasicReporter({ logStream: writer });

    const aBuildTarget = createTarget("a", "build");
    const aTestTarget = createTarget("a", "test");
    const bBuildTarget = createTarget("b", "build");

    const logs: [TargetLogData, string?][] = [
      [{ target: aBuildTarget, status: "running", duration: [0, 0] }],
      [{ target: aTestTarget, status: "running", duration: [0, 0] }],
      [{ target: bBuildTarget, status: "running", duration: [0, 0] }],
      [{ target: aBuildTarget, pid: 1 }, "test message for a#build"],
      [{ target: aTestTarget, pid: 1 }, "test message for a#test"],
      [{ target: aBuildTarget, pid: 1 }, "test message for a#build again"],
      [{ target: bBuildTarget, pid: 1 }, "test message for b#build"],
      [{ target: aTestTarget, pid: 1 }, "test message for a#test again"],
      [{ target: bBuildTarget, pid: 1 }, "test message for b#build again"],
      [{ target: aTestTarget, status: "success", duration: [10, 0] }],
      [{ target: bBuildTarget, status: "success", duration: [30, 0] }],
      [{ target: aBuildTarget, status: "failed", duration: [60, 0] }],
    ];

    for (const log of logs) {
      reporter.log({
        data: log[0],
        level: LogLevel.verbose,
        msg: log[1] ?? "empty message",
        timestamp: 0,
      });
    }

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "lage - Version 0.0.0 - 0 Workers

      [12:34:56] ✓ success  a - test (10.00s)
      [12:34:56] Completed: 1/3 (33%) [2 running, 0 pending]
      [12:34:56] ✓ success  b - build (30.00s)
      [12:34:56] Completed: 2/3 (67%) [1 running, 0 pending]
      [12:34:56] ✗ failed   a - build (60.00s)
      [12:34:56] Completed: 3/3 (100%) [0 running, 0 pending]"
    `);
  });

  it("can filter out verbose messages", () => {
    const writer = new MemoryStream();
    const reporter = new BasicReporter({ logStream: writer });

    const aBuildTarget = createTarget("a", "build");
    const aTestTarget = createTarget("a", "test");
    const bBuildTarget = createTarget("b", "build");

    const logs: [TargetLogData, string?][] = [
      [{ target: aBuildTarget, status: "running", duration: [0, 0] }],
      [{ target: aTestTarget, status: "running", duration: [0, 0] }],
      [{ target: bBuildTarget, status: "running", duration: [0, 0] }],
      [{ target: aBuildTarget, pid: 1 }, "test message for a#build"],
      [{ target: aTestTarget, pid: 1 }, "test message for a#test"],
      [{ target: aBuildTarget, pid: 1 }, "test message for a#build again"],
      [{ target: bBuildTarget, pid: 1 }, "test message for b#build"],
      [{ target: aTestTarget, pid: 1 }, "test message for a#test again"],
      [{ target: bBuildTarget, pid: 1 }, "test message for b#build again"],
      [{ target: aTestTarget, status: "success", duration: [10, 0] }],
      [{ target: bBuildTarget, status: "success", duration: [30, 0] }],
      [{ target: aBuildTarget, status: "failed", duration: [60, 0] }],
    ];

    for (const log of logs) {
      reporter.log({
        data: log[0],
        level: "status" in log[0] ? LogLevel.info : LogLevel.verbose,
        msg: log[1] ?? "empty message",
        timestamp: 0,
      });
    }

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "lage - Version 0.0.0 - 0 Workers

      [12:34:56] ✓ success  a - test (10.00s)
      [12:34:56] Completed: 1/3 (33%) [2 running, 0 pending]
      [12:34:56] ✓ success  b - build (30.00s)
      [12:34:56] Completed: 2/3 (67%) [1 running, 0 pending]
      [12:34:56] ✗ failed   a - build (60.00s)
      [12:34:56] Completed: 3/3 (100%) [0 running, 0 pending]"
    `);
  });

  it("can display a summary of a failure", () => {
    const writer = new MemoryStream();
    const reporter = new BasicReporter({ logStream: writer });

    const aBuildTarget = createTarget("a", "build");
    const aTestTarget = createTarget("a", "test");
    const bBuildTarget = createTarget("b", "build");

    const logs: [TargetLogData, string?][] = [
      [{ target: aBuildTarget, status: "running", duration: [0, 0] }],
      [{ target: aTestTarget, status: "running", duration: [0, 0] }],
      [{ target: bBuildTarget, status: "running", duration: [0, 0] }],
      [{ target: aBuildTarget, pid: 1 }, "test message for a#build"],
      [{ target: aTestTarget, pid: 1 }, "test message for a#test"],
      [{ target: aBuildTarget, pid: 1 }, "test message for a#build again, but look there is an error!"],
      [{ target: bBuildTarget, pid: 1 }, "test message for b#build"],
      [{ target: aTestTarget, pid: 1 }, "test message for a#test again"],
      [{ target: bBuildTarget, pid: 1 }, "test message for b#build again"],
      [{ target: aTestTarget, status: "success", duration: [10, 0] }],
      [{ target: bBuildTarget, status: "success", duration: [30, 0] }],
      [{ target: aBuildTarget, status: "failed", duration: [60, 0] }],
    ];

    for (const log of logs) {
      reporter.log({
        data: log[0],
        level: "status" in log[0] ? LogLevel.info : LogLevel.verbose,
        msg: log[1] ?? "",
        timestamp: 0,
      });
    }

    reporter.summarize({
      duration: [100, 0],
      startTime: [0, 0],
      results: "failed",
      targetRunByStatus: {
        success: [aTestTarget.id, bBuildTarget.id],
        failed: [aBuildTarget.id],
        pending: [],
        running: [],
        aborted: [],
        skipped: [],
        queued: [],
      },
      targetRuns: new Map([
        [aBuildTarget.id, createTargetRun(aBuildTarget, "failed")],
        [aTestTarget.id, createTargetRun(aTestTarget, "success")],
        [bBuildTarget.id, createTargetRun(bBuildTarget, "success")],
      ]),
      maxWorkerMemoryUsage: 0,
      workerRestarts: 0,
    });

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "lage - Version 0.0.0 - 0 Workers

      [12:34:56] ✓ success  a - test (10.00s)
      [12:34:56] Completed: 1/3 (33%) [2 running, 0 pending]
      [12:34:56] ✓ success  b - build (30.00s)
      [12:34:56] Completed: 2/3 (67%) [1 running, 0 pending]
      [12:34:56] ✗ failed   a - build (60.00s)
      [12:34:56] Completed: 3/3 (100%) [0 running, 0 pending]
      Summary
      ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
      success: 2, skipped: 0, pending: 0, aborted: 0, failed: 1
      worker restarts: 0, max worker memory usage: 0.00 MB
      ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
      [a build] ERROR DETECTED

      test message for a#build
      test message for a#build again, but look there is an error!

      ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
      Took a total of 1m 40.00s to complete.
      "
    `);
  });
});
