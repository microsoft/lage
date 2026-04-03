import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { LogLevel } from "@lage-run/logger";
import type { TargetRun } from "@lage-run/scheduler-types";
import { ProgressReporter } from "../ProgressReporter.js";
import type { TargetLogData, TargetMessageData } from "../types/TargetLogData.js";
import { createTarget, createTargetRun } from "./helpers.js";
import { MemoryStream } from "./MemoryStream.js";

describe("ProgressReporter", () => {
  let writer: MemoryStream;
  let reporter: ProgressReporter;

  beforeEach(() => {
    writer = new MemoryStream();
    reporter = new ProgressReporter({
      concurrency: 0,
      version: "0.0.0",
      logStream: writer,
      // Disable TaskReporter's progress reporting and ANSI codes
      // (progress reporting is thoroughly tested in cloudpack, and makes snapshots messier)
      taskReporterOptions: { plainTextMode: true },
    });
  });

  afterEach(async () => {
    await reporter.cleanup();
  });

  it("records each completion status (success, failed, skipped, aborted)", () => {
    const successTarget = createTarget("a", "build");
    const failedTarget = createTarget("b", "build");
    const skippedTarget = createTarget("c", "build");
    const abortedTarget = createTarget("d", "build");

    const targets = [successTarget, failedTarget, skippedTarget, abortedTarget];
    for (const target of targets) {
      reporter.log({ data: { target, status: "running", duration: [0, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });
    }

    reporter.log({ data: { target: successTarget, status: "success", duration: [10, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });
    reporter.log({ data: { target: failedTarget, status: "failed", duration: [20, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });
    reporter.log({ data: { target: skippedTarget, status: "skipped", duration: [0, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });
    reporter.log({ data: { target: abortedTarget, status: "aborted", duration: [5, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "lage - Version 0.0.0 - 0 Workers
      [12:34:56] - started   a - build
      [12:34:56] - started   b - build
      [12:34:56] - started   c - build
      [12:34:56] - started   d - build
      [12:34:56] ✓ completed a - build  (1ms)
      [12:34:56] ✗ failed    b - build  (1ms)
      [12:34:56] - skipped   c - build  (1ms)
      [12:34:56] ? aborted   d - build
      "
    `);
  });

  it("ignores pending and queued statuses", () => {
    const target = createTarget("a", "build");

    reporter.log({ data: { target, status: "pending", duration: [0, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });
    reporter.log({ data: { target, status: "queued", duration: [0, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });

    writer.end();

    expect(writer.getOutput()).toEqual("lage - Version 0.0.0 - 0 Workers\n");
  });

  // Documenting current behavior--unclear if this was intentional
  it("does not log target message entries", () => {
    reporter.log({
      data: { target: createTarget("a", "task"), pid: 1 } satisfies TargetMessageData,
      level: LogLevel.verbose,
      msg: "test message",
      timestamp: 0,
    });

    writer.end();

    expect(writer.getOutput()).toEqual("lage - Version 0.0.0 - 0 Workers\n");
  });

  // Currently messages without a status are ignored (unclear if this was intentional)
  it("interweaves statuses for different targets (messages ignored)", () => {
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
      [12:34:56] - started   a - build
      [12:34:56] - started   a - test
      [12:34:56] - started   b - build
      [12:34:56] ✓ completed a - test  (1ms)
      [12:34:56] ✓ completed b - build  (1ms)
      [12:34:56] ✗ failed    a - build  (1ms)
      "
    `);
  });

  it("can filter out verbose messages", () => {
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
      [12:34:56] - started   a - build
      [12:34:56] - started   a - test
      [12:34:56] - started   b - build
      [12:34:56] ✓ completed a - test  (1ms)
      [12:34:56] ✓ completed b - build  (1ms)
      [12:34:56] ✗ failed    a - build  (1ms)
      "
    `);
  });

  it("aborts remaining started tasks on summarize", () => {
    const aBuildTarget = createTarget("a", "build");
    const bBuildTarget = createTarget("b", "build");
    const cBuildTarget = createTarget("c", "build");

    // Start all three targets but only complete one
    reporter.log({ data: { target: aBuildTarget, status: "running" }, level: LogLevel.verbose, msg: "", timestamp: 0 });
    reporter.log({ data: { target: bBuildTarget, status: "running" }, level: LogLevel.verbose, msg: "", timestamp: 0 });
    reporter.log({ data: { target: aBuildTarget, status: "success", duration: [5, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });
    reporter.log({ data: { target: cBuildTarget, status: "queued" }, level: LogLevel.verbose, msg: "", timestamp: 0 });

    // Summarize with b still running and c queued — both should be aborted by TaskReporter
    reporter.summarize({
      duration: [10, 0],
      startTime: [0, 0],
      results: "failed",
      targetRunByStatus: {
        success: [aBuildTarget.id],
        failed: [],
        queued: [cBuildTarget.id],
        running: [bBuildTarget.id],
        aborted: [],
        skipped: [],
        pending: [],
      },
      targetRuns: new Map<string, TargetRun<unknown>>([
        [aBuildTarget.id, createTargetRun(aBuildTarget, "success")],
        [bBuildTarget.id, createTargetRun(bBuildTarget, "running")],
        [cBuildTarget.id, createTargetRun(cBuildTarget, "queued")],
      ]),
      maxWorkerMemoryUsage: 0,
      workerRestarts: 0,
    });

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "lage - Version 0.0.0 - 0 Workers
      [12:34:56] - started   a - build
      [12:34:56] - started   b - build
      [12:34:56] ✓ completed a - build  (1ms)
      [12:34:56] ? aborted   b - build
      [12:34:56] ? aborted   c - build

      Summary
      ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
      a - build success, took 60.00s, queued for 3.00s
      b - build running - incomplete, took 60.00s, queued for 3.00s
      c - build queued, took 60.00s, queued for 3.00s
      success: 1, skipped: 0, pending: 0, aborted: 2, failed: 0
      worker restarts: 0, max worker memory usage: 0.00 MB
      ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
      Took a total of 10.00s to complete.
      "
    `);
  });

  it("can display a summary of a failure", () => {
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
      targetRuns: new Map<string, TargetRun<unknown>>([
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
      [12:34:56] - started   a - build
      [12:34:56] - started   a - test
      [12:34:56] - started   b - build
      [12:34:56] ✓ completed a - test  (1ms)
      [12:34:56] ✓ completed b - build  (1ms)
      [12:34:56] ✗ failed    a - build  (1ms)

      Summary
      ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
      a - build failed, took 60.00s, queued for 3.00s
      a - test success, took 60.00s, queued for 3.00s
      b - build success, took 60.00s, queued for 3.00s
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
