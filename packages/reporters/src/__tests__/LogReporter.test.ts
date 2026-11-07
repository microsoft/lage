import { describe, expect, it } from "@jest/globals";
import { LogLevel } from "@lage-run/logger";
import type { TargetStatus } from "@lage-run/scheduler-types";
import { LogReporter, statusColorFn } from "../LogReporter.js";
import type { TargetLogData, TargetStatusData } from "../types/TargetLogData.js";
import { createTarget, createSummary } from "./helpers.js";
import { MemoryStream } from "./MemoryStream.js";

describe("LogReporter", () => {
  it("records a target status entry", () => {
    const writer = new MemoryStream();

    const reporter = new LogReporter({ grouped: false, logLevel: LogLevel.verbose, logStream: writer });
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
      "a task ✓ done - 10.00s
      a task ✖ fail
      a task » skip - abc123
      a task ➔ start
      a task - aborted
      a task … queued
      "
    `);
  });

  it("records a target message entry", () => {
    const writer = new MemoryStream();

    const reporter = new LogReporter({ grouped: false, logLevel: LogLevel.verbose, logStream: writer });

    reporter.log({
      data: { target: createTarget("a", "task") },
      level: LogLevel.verbose,
      msg: "test message",
      timestamp: 0,
    });

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "a task :  test message
      "
    `);
  });

  it("groups messages together", () => {
    const writer = new MemoryStream();

    const reporter = new LogReporter({ grouped: true, logLevel: LogLevel.verbose, logStream: writer });

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
      "a test ➔ start
      a test :  test message for a#test
      a test :  test message for a#test again
      a test ✓ done - 10.00s
      ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
      b build ➔ start
      b build :  test message for b#build
      b build :  test message for b#build again
      b build ✓ done - 30.00s
      ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
      a build ➔ start
      a build :  test message for a#build
      a build :  test message for a#build again
      a build ✖ fail
      ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
      "
    `);
  });

  it("interweave messages when ungrouped", () => {
    const writer = new MemoryStream();

    const reporter = new LogReporter({ grouped: false, logLevel: LogLevel.verbose, logStream: writer });

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
      "a build ➔ start
      a test ➔ start
      b build ➔ start
      a build :  test message for a#build
      a test :  test message for a#test
      a build :  test message for a#build again
      b build :  test message for b#build
      a test :  test message for a#test again
      b build :  test message for b#build again
      a test ✓ done - 10.00s
      b build ✓ done - 30.00s
      a build ✖ fail
      "
    `);
  });

  it("can filter out verbose messages", () => {
    const writer = new MemoryStream();

    const reporter = new LogReporter({ grouped: false, logLevel: LogLevel.info, logStream: writer });

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
      "a build ➔ start
      a build ✖ fail
      "
    `);
  });

  it("displays summary when no targets were run", () => {
    const writer = new MemoryStream();

    const reporter = new LogReporter({ grouped: true, logLevel: LogLevel.verbose, logStream: writer });

    const summary = createSummary({});
    reporter.summarize(summary);

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "Nothing has been run.
      ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
      Took a total of 1m 40.00s to complete. All targets skipped!
      "
    `);
  });

  it("can display a summary of a failure", () => {
    const writer = new MemoryStream();

    const reporter = new LogReporter({ grouped: true, logLevel: LogLevel.info, logStream: writer });

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
      failed: [aBuildTarget],
      success: [aTestTarget, bBuildTarget],
    });
    reporter.summarize(summary);

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "a test ➔ start
      a test :  test message for a#test
      a test :  test message for a#test again
      a test ✓ done - 10.00s
      ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
      b build ➔ start
      b build :  test message for b#build
      b build :  test message for b#build again
      b build ✓ done - 30.00s
      ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
      a build ➔ start
      a build :  test message for a#build
      a build :  test message for a#build again, but look there is an error!
      a build ✖ fail
      ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈

      Summary
      ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
      a build failed, took 60.00s, queued for 3.00s
      a test success, took 60.00s, queued for 3.00s
      b build success, took 60.00s, queued for 3.00s
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
