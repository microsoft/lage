import { describe, expect, it } from "@jest/globals";
import { LogLevel } from "@lage-run/logger";
import type { TargetStatus } from "@lage-run/scheduler-types";
import { GithubActionsReporter } from "../GithubActionsReporter.js";
import { statusColorFn } from "../LogReporter.js";
import type { TargetLogData, TargetStatusData } from "../types/TargetLogData.js";
import { createTarget, createSummary } from "./helpers.js";
import { MemoryStream } from "./MemoryStream.js";

describe("GithubActionsReporter", () => {
  it("records a target status entry", () => {
    const writer = new MemoryStream();

    const reporter = new GithubActionsReporter({ grouped: false, logLevel: LogLevel.verbose, logStream: writer });

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
      "VERB: a task ✓ done  - 10.00s
      VERB: a task ✖ fail
      VERB: a task » skip  - abc123
      VERB: a task ➔ start
      VERB: a task - aborted
      VERB: a task … queued
      "
    `);
  });

  it("records a target message entry", () => {
    const writer = new MemoryStream();

    const reporter = new GithubActionsReporter({ grouped: false, logLevel: LogLevel.verbose, logStream: writer });

    reporter.log({
      data: {
        target: createTarget("a", "task"),
        pid: 1,
      },
      level: LogLevel.verbose,
      msg: "test message",
      timestamp: 0,
    });

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "VERB: a task |  test message
      "
    `);
  });

  it("groups messages together using GitHub Actions ::group:: syntax", () => {
    const writer = new MemoryStream();

    const reporter = new GithubActionsReporter({ grouped: true, logLevel: LogLevel.verbose, logStream: writer });

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

    for (const [data, message] of logs) {
      reporter.log({ data, level: LogLevel.verbose, msg: message ?? "empty message", timestamp: 0 });
    }

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "::group::a test success, took 10.00s
      VERB:  ➔ start a test
      VERB:  |  test message for a#test
      VERB:  |  test message for a#test again
      VERB:  ✓ done a test - 10.00s
      ::endgroup::
      ::group::b build success, took 30.00s
      VERB:  ➔ start b build
      VERB:  |  test message for b#build
      VERB:  |  test message for b#build again
      VERB:  ✓ done b build - 30.00s
      ::endgroup::
      ::group::a build failed, took 60.00s
      VERB:  ➔ start a build
      VERB:  |  test message for a#build
      VERB:  |  test message for a#build again
      VERB:  ✖ fail a build
      ::endgroup::
      "
    `);
  });

  it("interweaves messages when ungrouped", () => {
    const writer = new MemoryStream();

    const reporter = new GithubActionsReporter({ grouped: false, logLevel: LogLevel.verbose, logStream: writer });

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

    for (const [data, message] of logs) {
      reporter.log({ data, level: LogLevel.verbose, msg: message ?? "empty message", timestamp: 0 });
    }

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
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
    const writer = new MemoryStream();

    const reporter = new GithubActionsReporter({ grouped: false, logLevel: LogLevel.info, logStream: writer });

    const target = createTarget("a", "build");

    const logs: [TargetLogData, string?][] = [
      [{ target, status: "running", duration: [0, 0] }],
      [{ target, pid: 1 }, "test message for a#build"],
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
      "INFO: a build ➔ start
      INFO: a build ✖ fail
      "
    `);
  });

  it("uses ::error:: and ::group::Summary in summarize", () => {
    const writer = new MemoryStream();

    const reporter = new GithubActionsReporter({ grouped: true, logLevel: LogLevel.verbose, logStream: writer });

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
      "::group::a test success, took 10.00s
      INFO:  ➔ start a test
      VERB:  |  test message for a#test
      VERB:  |  test message for a#test again
      INFO:  ✓ done a test - 10.00s
      ::endgroup::
      ::group::b build success, took 30.00s
      INFO:  ➔ start b build
      VERB:  |  test message for b#build
      VERB:  |  test message for b#build again
      INFO:  ✓ done b build - 30.00s
      ::endgroup::
      ::group::a build failed, took 60.00s
      INFO:  ➔ start a build
      VERB:  |  test message for a#build
      VERB:  |  test message for a#build again, but look there is an error!
      INFO:  ✖ fail a build
      ::endgroup::
      ::group::Summary
      INFO: a build failed, took 60.00s
      INFO: a test success, took 60.00s
      INFO: b build success, took 60.00s
      [Tasks Count] success: 2, skipped: 0, pending: 0, aborted: 0
      ::endgroup::
      ::error title=a build::Build failed
      ::error::test message for a#build
      ::error::test message for a#build again, but look there is an error!
      INFO:  Took a total of 1m 40.00s to complete
      "
    `);
  });
});
