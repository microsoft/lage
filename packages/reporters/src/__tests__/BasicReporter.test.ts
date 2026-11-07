import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { LogLevel } from "@lage-run/logger";
import type { TargetStatus } from "@lage-run/scheduler-types";
import { BasicReporter } from "../BasicReporter.js";
import type { TargetLogData, TargetData, TargetStatusData } from "../types/TargetLogData.js";
import { statusColorFn } from "../LogReporter.js";
import { createTarget, createSummary } from "./helpers.js";
import { MemoryStream } from "./MemoryStream.js";

describe("BasicReporter", () => {
  let writer: MemoryStream;
  let reporter: BasicReporter;

  beforeEach(() => {
    jest.useFakeTimers();
    writer = new MemoryStream();
    reporter = new BasicReporter({ logStream: writer });
  });

  afterEach(() => {
    reporter.cleanup();
    jest.useRealTimers();
  });

  it("records a target status entry", () => {
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
    reporter.log({
      data: { target: createTarget("a", "task") } satisfies TargetData,
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
    const aBuildTarget = createTarget("a", "build");
    const aTestTarget = createTarget("a", "test");
    const bBuildTarget = createTarget("b", "build");

    const logs: [TargetLogData, string?][] = [
      [{ target: aBuildTarget, status: "running", duration: [0, 0] }],
      [{ target: aTestTarget, status: "running", duration: [0, 0] }],
      [{ target: bBuildTarget, status: "running", duration: [0, 0] }],
      [{ target: aBuildTarget }, "test message for a#build"],
      [{ target: aTestTarget }, "test message for a#test"],
      [{ target: aBuildTarget }, "test message for a#build again"],
      [{ target: bBuildTarget }, "test message for b#build"],
      [{ target: aTestTarget }, "test message for a#test again"],
      [{ target: bBuildTarget }, "test message for b#build again"],
      [{ target: aTestTarget, status: "success", duration: [10, 0] }],
      [{ target: bBuildTarget, status: "success", duration: [30, 0] }],
      [{ target: aBuildTarget, status: "failed", duration: [60, 0] }],
    ];

    for (const [data, message] of logs) {
      reporter.log({ data, level: LogLevel.verbose, msg: message ?? "empty message", timestamp: 0 });
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
    const target = createTarget("a", "build");

    const logs: [TargetLogData, string?][] = [
      [{ target, status: "running", duration: [0, 0] }],
      [{ target }, "test message for a#build"],
      [{ target, status: "failed", duration: [60, 0] }],
    ];

    for (const [data, message] of logs) {
      reporter.log({
        data,
        level: "status" in data ? LogLevel.info : LogLevel.verbose,
        msg: message ?? "empty message",
        timestamp: 0,
      });
    }

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "lage - Version 0.0.0 - 0 Workers

      [12:34:56] ✗ failed   a - build (60.00s)
      [12:34:56] Completed: 1/1 (100%) [0 running, 0 pending]"
    `);
  });

  it("displays summary when no targets were run", () => {
    const summary = createSummary({});
    reporter.summarize(summary);

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "lage - Version 0.0.0 - 0 Workers

      Nothing has been run.
      ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
      Took a total of 1m 40.00s to complete. All targets skipped!
      "
    `);
  });

  it("renders periodic progress updates on the timer interval", () => {
    const aBuildTarget = createTarget("a", "build");
    const bBuildTarget = createTarget("b", "build");

    // Start two targets — this also starts the setInterval timer
    reporter.log({ data: { target: aBuildTarget, status: "running", duration: [0, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });
    reporter.log({ data: { target: bBuildTarget, status: "running", duration: [0, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });
    writer.clearOutput();

    // Advance past the default 500ms interval — should trigger a status-only render
    jest.advanceTimersByTime(500);

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "
      [12:34:56] Completed: 0/2 (0%) [2 running, 0 pending]"
    `);
    writer.clearOutput();

    // Complete one target (synchronous render with completion message)
    reporter.log({ data: { target: aBuildTarget, status: "success", duration: [5, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "
      [12:34:56] ✓ success  a - build (5.00s)
      [12:34:56] Completed: 1/2 (50%) [1 running, 0 pending]"
    `);
    writer.clearOutput();

    // Advance again — status line should reflect updated counts
    jest.advanceTimersByTime(500);

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "
      [12:34:56] Completed: 1/2 (50%) [1 running, 0 pending]"
    `);
    writer.clearOutput();
  });

  it("can display a summary of a failure", () => {
    const aBuildTarget = createTarget("a", "build");
    const aTestTarget = createTarget("a", "test");
    const bBuildTarget = createTarget("b", "build");

    const logs: [TargetLogData, string?][] = [
      [{ target: aBuildTarget, status: "running", duration: [0, 0] }],
      [{ target: aTestTarget, status: "running", duration: [0, 0] }],
      [{ target: bBuildTarget, status: "running", duration: [0, 0] }],
      [{ target: aBuildTarget }, "test message for a#build"],
      [{ target: aTestTarget }, "test message for a#test"],
      [{ target: aBuildTarget }, "test message for a#build again, but look there is an error!"],
      [{ target: bBuildTarget }, "test message for b#build"],
      [{ target: aTestTarget }, "test message for a#test again"],
      [{ target: bBuildTarget }, "test message for b#build again"],
      [{ target: aTestTarget, status: "success", duration: [10, 0] }],
      [{ target: bBuildTarget, status: "success", duration: [30, 0] }],
      [{ target: aBuildTarget, status: "failed", duration: [60, 0] }],
    ];

    for (const [data, message] of logs) {
      reporter.log({
        data,
        level: "status" in data ? LogLevel.info : LogLevel.verbose,
        msg: message ?? "",
        timestamp: 0,
      });
    }

    const summary = createSummary({
      success: [aTestTarget, bBuildTarget],
      failed: [aBuildTarget],
    });
    reporter.summarize(summary);

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
