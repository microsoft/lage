import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { LogLevel } from "@lage-run/logger";
import { ProgressReporter } from "../ProgressReporter.js";
import type { TargetLogData } from "../types/TargetLogData.js";
import { createTarget, createSummary } from "./helpers.js";
import { MemoryStream } from "./MemoryStream.js";

const cloudpackStickyInterval = 250;

describe("ProgressReporter", () => {
  let writer: MemoryStream | undefined;
  let reporter: ProgressReporter | undefined;

  function initReporter(options?: { showStickies?: boolean }) {
    const _writer = new MemoryStream();
    const _reporter = new ProgressReporter({
      concurrency: 0,
      version: "0.0.0",
      logStream: _writer,
      // Disable TaskReporter's sticky progress reporting and ANSI codes by default
      taskReporterOptions: options?.showStickies ? undefined : { plainTextMode: true },
    });
    return { writer: _writer, reporter: _reporter };
  }

  afterEach(async () => {
    await reporter?.cleanup();
    reporter = undefined;
    writer = undefined;
    jest.useRealTimers();
  });

  it("records each completion status (success, failed, skipped, aborted)", () => {
    ({ writer, reporter } = initReporter());

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
    ({ writer, reporter } = initReporter());

    const target = createTarget("a", "build");

    reporter.log({ data: { target, status: "pending", duration: [0, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });
    reporter.log({ data: { target, status: "queued", duration: [0, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });

    writer.end();

    expect(writer.getOutput()).toEqual("lage - Version 0.0.0 - 0 Workers\n");
  });

  // Documenting current behavior--unclear if this was intentional
  it("does not log target message entries", () => {
    ({ writer, reporter } = initReporter());

    reporter.log({
      data: { target: createTarget("a", "task") },
      level: LogLevel.verbose,
      msg: "test message",
      timestamp: 0,
    });

    writer.end();

    expect(writer.getOutput()).toEqual("lage - Version 0.0.0 - 0 Workers\n");
  });

  // Currently messages without a status are ignored (unclear if this was intentional)
  it("interweaves statuses for different targets (messages ignored)", () => {
    ({ writer, reporter } = initReporter());

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

    for (const log of logs) {
      reporter.log({ data: log[0], level: LogLevel.verbose, msg: log[1] ?? "empty message", timestamp: 0 });
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

  it("displays summary when no targets were run", () => {
    ({ writer, reporter } = initReporter());

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

  it("aborts remaining started tasks on summarize", () => {
    ({ writer, reporter } = initReporter());

    const aBuildTarget = createTarget("a", "build");
    const bBuildTarget = createTarget("b", "build");
    const cBuildTarget = createTarget("c", "build");

    // Start all three targets but only complete one
    reporter.log({ data: { target: aBuildTarget, status: "running" }, level: LogLevel.verbose, msg: "", timestamp: 0 });
    reporter.log({ data: { target: bBuildTarget, status: "running" }, level: LogLevel.verbose, msg: "", timestamp: 0 });
    reporter.log({ data: { target: aBuildTarget, status: "success", duration: [5, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });
    reporter.log({ data: { target: cBuildTarget, status: "queued" }, level: LogLevel.verbose, msg: "", timestamp: 0 });

    // Summarize with b still running and c queued — both should be aborted by TaskReporter
    const summary = createSummary({
      success: [aBuildTarget],
      running: [bBuildTarget],
      queued: [cBuildTarget],
    });
    reporter.summarize(summary);

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
      Took a total of 1m 40.00s to complete.
      "
    `);
  });

  it("can display a summary of a failure", () => {
    ({ writer, reporter } = initReporter());

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

    for (const [log, message] of logs) {
      reporter.log({ data: log, level: LogLevel.verbose, msg: message ?? "", timestamp: 0 });
    }

    const summary = createSummary({
      failed: [aBuildTarget],
      success: [aTestTarget, bBuildTarget],
    });
    reporter.summarize(summary);

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

  // This tests the integration of TaskReporter's sticky progress updates
  it("renders periodic sticky updates on a timer and does not show stickies or cloudpack summary on cleanup", async () => {
    jest.useFakeTimers();
    ({ writer, reporter } = initReporter({ showStickies: true }));

    const aBuildTarget = createTarget("a", "build");
    const bBuildTarget = createTarget("b", "build");
    const cBuildTarget = createTarget("c", "build");

    // Start targets — this also starts the setInterval timer
    reporter.log({ data: { target: aBuildTarget, status: "running", duration: [0, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });
    reporter.log({ data: { target: bBuildTarget, status: "running", duration: [0, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });
    reporter.log({ data: { target: cBuildTarget, status: "queued", duration: [0, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });

    writer.clearOutput();

    // Advance past the default 250ms interval — should trigger a status-only render
    jest.advanceTimersByTime(cloudpackStickyInterval);

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "
      [ Running: 2 | Pending: 1 ]
      [12:34:56] ⠙ a - build
      [12:34:56] ⠋ b - build
      "
    `);
    writer.clearOutput();

    // Complete one target (synchronous render with completion message)
    reporter.log({ data: { target: aBuildTarget, status: "success", duration: [5, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });

    // Current limitation which won't be noticeable in real usage: the stickies update separately
    // from the completion message, so the count is wrong until the next interval
    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "[12:34:56] ✓ completed a - build  (1ms)

      [ Running: 2 | Pending: 1 ]
      [12:34:56] ⠸ a - build
      [12:34:56] ⠙ b - build
      "
    `);
    writer.clearOutput();

    // Advance again — status line should reflect updated counts
    jest.advanceTimersByTime(cloudpackStickyInterval);

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "
      [ Running: 1 | Pending: 1 | Completed: 1 ]
      [12:34:56] ⠸ b - build
      "
    `);
    writer.clearOutput();

    // Complete the second target and advance timers sothe stickies update
    reporter.log({ data: { target: bBuildTarget, status: "success", duration: [10, 0] }, level: LogLevel.verbose, msg: "", timestamp: 0 });
    jest.advanceTimersByTime(cloudpackStickyInterval);
    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "[12:34:56] ✓ completed b - build  (1ms)

      [ Running: 1 | Pending: 1 | Completed: 1 ]
      [12:34:56] ⠴ b - build

      [ Idle | Pending: 1 | Completed: 2 ]
      "
    `);
    writer.clearOutput();

    // Log the summary (with current arguments it will show as "success" which is debatable for canceling)
    const summary = createSummary({
      success: [aBuildTarget, bBuildTarget],
      queued: [cBuildTarget],
    });
    reporter.summarize(summary);

    // the last line of totals will be slightly off here too (that line should be erased in reality,
    // but we don't capture the ANSI codes)
    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "[12:34:56] ? aborted   c - build

      [ Idle | Pending: 1 | Completed: 2 ]

      Summary
      ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
      a - build success, took 60.00s, queued for 3.00s
      b - build success, took 60.00s, queued for 3.00s
      c - build queued, took 60.00s, queued for 3.00s
      success: 2, skipped: 0, pending: 0, aborted: 1, failed: 0
      worker restarts: 0, max worker memory usage: 0.00 MB
      ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
      Took a total of 1m 40.00s to complete.
      "
    `);
    writer.clearOutput();

    // Advance the timers to ensure sticky updates are cleared
    jest.advanceTimersByTime(cloudpackStickyInterval);
    expect(writer.getOutput()).toEqual("");

    // Ensure no more writes from TaskReporter on cleanup
    await reporter.cleanup();
    jest.advanceTimersByTime(cloudpackStickyInterval);
    expect(writer.getOutput()).toEqual("");
  });
});
