// For this test, we need have a force color set before any imports
process.env.FORCE_COLOR = "0";

import { LogLevel } from "@lage-run/logger";
import { NpmLogReporter } from "../src/NpmLogReporter";
import streams from "memory-streams";
import type { TargetMessageEntry, TargetStatusEntry } from "../src/types/TargetLogEntry";

function createTarget(packageName: string, task: string) {
  return {
    id: `${packageName}#${task}`,
    cwd: `/repo/root/packages/${packageName}`,
    dependencies: [],
    packageName,
    task,
    label: `${packageName} - ${task}`,
  };
}

describe("NpmLogReporter", () => {
  it("records a target status entry", () => {
    const writer = new streams.WritableStream();

    const reporter = new NpmLogReporter({ grouped: false, logLevel: LogLevel.verbose });
    reporter.npmLog.stream = writer;

    reporter.log({
      data: {
        target: createTarget("a", "task"),
        status: "running",
        duration: [0, 0],
        startTime: [0, 0],
      } as TargetStatusEntry,
      level: LogLevel.verbose,
      msg: "test message",
      timestamp: 0,
    });

    writer.end();

    expect(writer.toString()).toMatchInlineSnapshot(`
      "verb a task ➔ start 
      "
    `);
  });

  it("records a target message entry", () => {
    const writer = new streams.WritableStream();

    const reporter = new NpmLogReporter({ grouped: false, logLevel: LogLevel.verbose });
    reporter.npmLog.stream = writer;

    reporter.log({
      data: {
        target: createTarget("a", "task"),
        pid: 1,
      } as TargetMessageEntry,
      level: LogLevel.verbose,
      msg: "test message",
      timestamp: 0,
    });

    writer.end();

    expect(writer.toString()).toMatchInlineSnapshot(`
      "verb a task |  test message
      "
    `);
  });

  it("groups messages together", () => {
    const writer = new streams.WritableStream();

    const reporter = new NpmLogReporter({ grouped: true, logLevel: LogLevel.verbose });
    reporter.npmLog.stream = writer;

    const aBuildTarget = createTarget("a", "build");
    const aTestTarget = createTarget("a", "test");
    const bBuildTarget = createTarget("b", "build");

    const logs = [
      [{ target: aBuildTarget, status: "running", duration: [0, 0], startTime: [0, 0] }],
      [{ target: aTestTarget, status: "running", duration: [0, 0], startTime: [1, 0] }],
      [{ target: bBuildTarget, status: "running", duration: [0, 0], startTime: [2, 0] }],
      [{ target: aBuildTarget, pid: 1 }, "test message for a#build"],
      [{ target: aTestTarget, pid: 1 }, "test message for a#test"],
      [{ target: aBuildTarget, pid: 1 }, "test message for a#build again"],
      [{ target: bBuildTarget, pid: 1 }, "test message for b#build"],
      [{ target: aTestTarget, pid: 1 }, "test message for a#test again"],
      [{ target: bBuildTarget, pid: 1 }, "test message for b#build again"],
      [{ target: aTestTarget, status: "success", duration: [10, 0], startTime: [0, 0] }],
      [{ target: bBuildTarget, status: "success", duration: [30, 0], startTime: [2, 0] }],
      [{ target: aBuildTarget, status: "failed", duration: [60, 0], startTime: [1, 0] }],
    ] as [TargetStatusEntry | TargetMessageEntry, string?][];

    for (const log of logs) {
      reporter.log({
        data: log[0],
        level: LogLevel.verbose,
        msg: log[1] ?? "empty message",
        timestamp: 0,
      });
    }

    writer.end();

    expect(writer.toString()).toMatchInlineSnapshot(`
      "verb ➔ start a test
      verb |  test message for a#test
      verb |  test message for a#test again
      verb ✓ done a test - 10.00s
      info ----------------------------------------------
      verb ➔ start b build
      verb |  test message for b#build
      verb |  test message for b#build again
      verb ✓ done b build - 30.00s
      info ----------------------------------------------
      verb ➔ start a build
      verb |  test message for a#build
      verb |  test message for a#build again
      verb ✖ fail a build
      info ----------------------------------------------
      "
    `);
  });

  it("interweave messages when ungrouped", () => {
    const writer = new streams.WritableStream();

    const reporter = new NpmLogReporter({ grouped: false, logLevel: LogLevel.verbose });
    reporter.npmLog.stream = writer;

    const aBuildTarget = createTarget("a", "build");
    const aTestTarget = createTarget("a", "test");
    const bBuildTarget = createTarget("b", "build");

    const logs = [
      [{ target: aBuildTarget, status: "running", duration: [0, 0], startTime: [0, 0] }],
      [{ target: aTestTarget, status: "running", duration: [0, 0], startTime: [1, 0] }],
      [{ target: bBuildTarget, status: "running", duration: [0, 0], startTime: [2, 0] }],
      [{ target: aBuildTarget, pid: 1 }, "test message for a#build"],
      [{ target: aTestTarget, pid: 1 }, "test message for a#test"],
      [{ target: aBuildTarget, pid: 1 }, "test message for a#build again"],
      [{ target: bBuildTarget, pid: 1 }, "test message for b#build"],
      [{ target: aTestTarget, pid: 1 }, "test message for a#test again"],
      [{ target: bBuildTarget, pid: 1 }, "test message for b#build again"],
      [{ target: aTestTarget, status: "success", duration: [10, 0], startTime: [0, 0] }],
      [{ target: bBuildTarget, status: "success", duration: [30, 0], startTime: [2, 0] }],
      [{ target: aBuildTarget, status: "failed", duration: [60, 0], startTime: [1, 0] }],
    ] as [TargetStatusEntry | TargetMessageEntry, string?][];

    for (const log of logs) {
      reporter.log({
        data: log[0],
        level: LogLevel.verbose,
        msg: log[1] ?? "empty message",
        timestamp: 0,
      });
    }

    writer.end();

    expect(writer.toString()).toMatchInlineSnapshot(`
      "verb a build ➔ start 
      verb a test ➔ start 
      verb b build ➔ start 
      verb a build |  test message for a#build
      verb a test |  test message for a#test
      verb a build |  test message for a#build again
      verb b build |  test message for b#build
      verb a test |  test message for a#test again
      verb b build |  test message for b#build again
      verb a test ✓ done  - 10.00s
      verb b build ✓ done  - 30.00s
      verb a build ✖ fail 
      "
    `);
  });

  it("can filter out verbose messages", () => {
    const writer = new streams.WritableStream();

    const reporter = new NpmLogReporter({ grouped: false, logLevel: LogLevel.info });
    reporter.npmLog.stream = writer;

    const aBuildTarget = createTarget("a", "build");
    const aTestTarget = createTarget("a", "test");
    const bBuildTarget = createTarget("b", "build");

    const logs = [
      [{ target: aBuildTarget, status: "running", duration: [0, 0], startTime: [0, 0] }],
      [{ target: aTestTarget, status: "running", duration: [0, 0], startTime: [1, 0] }],
      [{ target: bBuildTarget, status: "running", duration: [0, 0], startTime: [2, 0] }],
      [{ target: aBuildTarget, pid: 1 }, "test message for a#build"],
      [{ target: aTestTarget, pid: 1 }, "test message for a#test"],
      [{ target: aBuildTarget, pid: 1 }, "test message for a#build again"],
      [{ target: bBuildTarget, pid: 1 }, "test message for b#build"],
      [{ target: aTestTarget, pid: 1 }, "test message for a#test again"],
      [{ target: bBuildTarget, pid: 1 }, "test message for b#build again"],
      [{ target: aTestTarget, status: "success", duration: [10, 0], startTime: [0, 0] }],
      [{ target: bBuildTarget, status: "success", duration: [30, 0], startTime: [2, 0] }],
      [{ target: aBuildTarget, status: "failed", duration: [60, 0], startTime: [1, 0] }],
    ] as [TargetStatusEntry | TargetMessageEntry, string?][];

    for (const log of logs) {
      reporter.log({
        data: log[0],
        level: "status" in log[0] ? LogLevel.info : LogLevel.verbose,
        msg: log[1] ?? "empty message",
        timestamp: 0,
      });
    }

    writer.end();

    expect(writer.toString()).toMatchInlineSnapshot(`
      "info a build ➔ start 
      info a test ➔ start 
      info b build ➔ start 
      info a test ✓ done  - 10.00s
      info b build ✓ done  - 30.00s
      info a build ✖ fail 
      "
    `);
  });

  it("can filter out verbose messages", () => {
    const writer = new streams.WritableStream();

    const reporter = new NpmLogReporter({ grouped: true, logLevel: LogLevel.info });
    reporter.npmLog.stream = writer;

    const aBuildTarget = createTarget("a", "build");
    const aTestTarget = createTarget("a", "test");
    const bBuildTarget = createTarget("b", "build");

    const logs = [
      [{ target: aBuildTarget, status: "running", duration: [0, 0], startTime: [0, 0] }],
      [{ target: aTestTarget, status: "running", duration: [0, 0], startTime: [1, 0] }],
      [{ target: bBuildTarget, status: "running", duration: [0, 0], startTime: [2, 0] }],
      [{ target: aBuildTarget, pid: 1 }, "test message for a#build"],
      [{ target: aTestTarget, pid: 1 }, "test message for a#test"],
      [{ target: aBuildTarget, pid: 1 }, "test message for a#build again, but look there is an error!"],
      [{ target: bBuildTarget, pid: 1 }, "test message for b#build"],
      [{ target: aTestTarget, pid: 1 }, "test message for a#test again"],
      [{ target: bBuildTarget, pid: 1 }, "test message for b#build again"],
      [{ target: aTestTarget, status: "success", duration: [10, 0], startTime: [0, 0] }],
      [{ target: bBuildTarget, status: "success", duration: [30, 0], startTime: [2, 0] }],
      [{ target: aBuildTarget, status: "failed", duration: [60, 0], startTime: [1, 0] }],
    ] as [TargetStatusEntry | TargetMessageEntry, string?][];

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
      },
      targetRuns: new Map(),
    });

    writer.end();

    expect(writer.toString()).toMatchInlineSnapshot(`
"info ➔ start a test
info ✓ done a test - 10.00s
info ➔ start b build
info ✓ done b build - 30.00s
info ➔ start a build
info ✖ fail a build
info 🏗 Summary
info 
info Nothing has been run.
info ----------------------------------------------
ERR! [a build] ERROR DETECTED
ERR! 
ERR! test message for a#build
ERR! test message for a#build again, but look there is an error!
ERR! 
info ----------------------------------------------
info Took a total of 1m 40.00s to complete
"
`);
  });
});
