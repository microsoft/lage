// For this test, we need have a force color set before any imports
process.env.FORCE_COLOR = "0";

import { LogLevel } from "@lage-run/logger";
import { LogReporter } from "../src/LogReporter";
import streams from "memory-streams";
import type { TargetMessageEntry, TargetStatusEntry } from "../src/types/TargetLogEntry";
import { TargetRun } from "@lage-run/scheduler";

function createTarget(packageName: string, task: string) {
  return {
    id: `${packageName}#${task}`,
    cwd: `/repo/root/packages/${packageName}`,
    dependencies: [],
    dependents: [],
    depSpecs: [],
    packageName,
    task,
    label: `${packageName} - ${task}`,
  };
}

describe("LogReporter", () => {
  it("records a target status entry", () => {
    const writer = new streams.WritableStream();

    const reporter = new LogReporter({ grouped: false, logLevel: LogLevel.verbose });
    reporter.logStream = writer;

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
      "a task ➔ start
      "
    `);
  });

  it("records a target message entry", () => {
    const writer = new streams.WritableStream();

    const reporter = new LogReporter({ grouped: false, logLevel: LogLevel.verbose });
    reporter.logStream = writer;

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
      "a task :  test message
      "
    `);
  });

  it("groups messages together", () => {
    const writer = new streams.WritableStream();

    const reporter = new LogReporter({ grouped: true, logLevel: LogLevel.verbose });
    reporter.logStream = writer;

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
    const writer = new streams.WritableStream();

    const reporter = new LogReporter({ grouped: false, logLevel: LogLevel.verbose });
    reporter.logStream = writer;

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
    const writer = new streams.WritableStream();

    const reporter = new LogReporter({ grouped: false, logLevel: LogLevel.info });
    reporter.logStream = writer;

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
      "a build ➔ start
      a test ➔ start
      b build ➔ start
      a test ✓ done - 10.00s
      b build ✓ done - 30.00s
      a build ✖ fail
      "
    `);
  });

  it("can display a summary of a failure", () => {
    const writer = new streams.WritableStream();

    const reporter = new LogReporter({ grouped: true, logLevel: LogLevel.info });
    reporter.logStream = writer;

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
      targetRuns: new Map([
        [aBuildTarget.id, { target: { hidden: false, packageName: "a", task: "build" }, status: "failed" } as unknown as TargetRun],
        [aTestTarget.id, { target: { hidden: false, packageName: "a", task: "test" }, status: "success" } as unknown as TargetRun],
        [bBuildTarget.id, { target: { hidden: false, packageName: "b", task: "build" }, status: "success" } as unknown as TargetRun],
      ]),
    });

    writer.end();

    expect(writer.toString()).toMatchInlineSnapshot(`
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
a build failed
a test success
b build success
success: 2, skipped: 0, pending: 0, aborted: 0, failed: 1
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
