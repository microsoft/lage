// For this test, we need have a force color set before any imports
process.env.FORCE_COLOR = "0";

import { LogLevel } from "@lage-run/logger";
import { AdoReporter } from "../src/AdoReporter";
import streams from "memory-streams";
import type { TargetMessageEntry, TargetStatusEntry } from "../src/types/TargetLogEntry";

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

describe("AdoReporter", () => {
  it("records a target status entry", () => {
    const writer = new streams.WritableStream();

    const reporter = new AdoReporter({ grouped: false, logLevel: LogLevel.verbose });
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
      "VERB: a task ➔ start 
      "
    `);
  });

  it("records a target message entry", () => {
    const writer = new streams.WritableStream();

    const reporter = new AdoReporter({ grouped: false, logLevel: LogLevel.verbose });
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
      "VERB: a task |  test message
      "
    `);
  });

  it("groups messages together", () => {
    const writer = new streams.WritableStream();

    const reporter = new AdoReporter({ grouped: true, logLevel: LogLevel.verbose });
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
      "##[group] a test success, took 10.00s
      VERB:  ➔ start a test
      VERB:  |  test message for a#test
      VERB:  |  test message for a#test again
      VERB:  ✓ done a test - 10.00s
      ##[endgroup]
      ##[group] b build success, took 30.00s
      VERB:  ➔ start b build
      VERB:  |  test message for b#build
      VERB:  |  test message for b#build again
      VERB:  ✓ done b build - 30.00s
      ##[endgroup]
      ##[group] a build failed, took 60.00s
      VERB:  ➔ start a build
      VERB:  |  test message for a#build
      VERB:  |  test message for a#build again
      VERB:  ✖ fail a build
      ##[endgroup]
      "
    `);
  });

  it("interweave messages when ungrouped", () => {
    const writer = new streams.WritableStream();

    const reporter = new AdoReporter({ grouped: false, logLevel: LogLevel.verbose });
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
      "VERB: a build ➔ start 
      VERB: a test ➔ start 
      VERB: b build ➔ start 
      VERB: a build |  test message for a#build
      VERB: a test |  test message for a#test
      VERB: a build |  test message for a#build again
      VERB: b build |  test message for b#build
      VERB: a test |  test message for a#test again
      VERB: b build |  test message for b#build again
      VERB: a test ✓ done  - 10.00s
      VERB: b build ✓ done  - 30.00s
      VERB: a build ✖ fail 
      "
    `);
  });

  it("can filter out verbose messages", () => {
    const writer = new streams.WritableStream();

    const reporter = new AdoReporter({ grouped: false, logLevel: LogLevel.info });
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
      "INFO: a build ➔ start 
      INFO: a test ➔ start 
      INFO: b build ➔ start 
      INFO: a test ✓ done  - 10.00s
      INFO: b build ✓ done  - 30.00s
      INFO: a build ✖ fail 
      "
    `);
  });

  it("can group verbose messages, displaying summary", () => {
    const writer = new streams.WritableStream();

    const reporter = new AdoReporter({ grouped: true, logLevel: LogLevel.verbose });
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
        queued: [],
      },
      targetRuns: new Map([
        [aBuildTarget.id, { target: aBuildTarget, status: "failed", duration: [60, 0], startTime: [1, 0], queueTime: [0, 0] }],
        [aTestTarget.id, { target: aTestTarget, status: "success", duration: [60, 0], startTime: [1, 0], queueTime: [0, 0] }],
        [bBuildTarget.id, { target: bBuildTarget, status: "success", duration: [60, 0], startTime: [1, 0], queueTime: [0, 0] }],
      ]),
    });

    writer.end();

    expect(writer.toString()).toMatchInlineSnapshot(`
      "##[group] a test success, took 10.00s
      INFO:  ➔ start a test
      VERB:  |  test message for a#test
      VERB:  |  test message for a#test again
      INFO:  ✓ done a test - 10.00s
      ##[endgroup]
      ##[group] b build success, took 30.00s
      INFO:  ➔ start b build
      VERB:  |  test message for b#build
      VERB:  |  test message for b#build again
      INFO:  ✓ done b build - 30.00s
      ##[endgroup]
      ##[group] a build failed, took 60.00s
      INFO:  ➔ start a build
      VERB:  |  test message for a#build
      VERB:  |  test message for a#build again, but look there is an error!
      INFO:  ✖ fail a build
      ##[endgroup]
      ##[section]Summary
      INFO: a build failed, took 60.00s
      INFO: a test success, took 60.00s
      INFO: b build success, took 60.00s
      [Tasks Count] success: 2, skipped: 0, pending: 0, aborted: 0
      ##[error] [a build] ERROR DETECTED
      ##[error] 
      ##[error] test message for a#build
      ##[error] test message for a#build again, but look there is an error!
      ##[error] 
      INFO:  Took a total of 1m 40.00s to complete
      "
    `);
  });
});
