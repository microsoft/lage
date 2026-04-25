import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { LogLevel } from "@lage-run/logger";
import { JsonReporter } from "../JsonReporter.js";
import type { TargetLogData } from "../types/TargetLogData.js";
import { createSummary, createTarget } from "./helpers.js";

describe("JsonReporter", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("logs both status and message entries", () => {
    const rawLogs: unknown[] = [];
    jest.spyOn(console, "log").mockImplementation((message: string) => {
      rawLogs.push(JSON.parse(message));
    });

    const reporter = new JsonReporter({ logLevel: LogLevel.verbose, indented: false });

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
      reporter.log({ data, level: LogLevel.verbose, msg: message ?? "", timestamp: 0 });
    }

    const common = { level: LogLevel.verbose, msg: "", timestamp: 0 };

    expect(rawLogs).toEqual([
      { data: { duration: [0, 0], status: "running", target: aBuildTarget }, ...common },
      { data: { duration: [0, 0], status: "running", target: aTestTarget }, ...common },
      { data: { duration: [0, 0], status: "running", target: bBuildTarget }, ...common },
      { data: { target: aBuildTarget }, ...common, msg: "test message for a#build" },
      { data: { target: aTestTarget }, ...common, msg: "test message for a#test" },
      { data: { target: aBuildTarget }, ...common, msg: "test message for a#build again" },
      { data: { target: bBuildTarget }, ...common, msg: "test message for b#build" },
      { data: { target: aTestTarget }, ...common, msg: "test message for a#test again" },
      { data: { target: bBuildTarget }, ...common, msg: "test message for b#build again" },
      { data: { duration: [10, 0], status: "success", target: aTestTarget }, ...common },
      { data: { duration: [30, 0], status: "success", target: bBuildTarget }, ...common },
      { data: { duration: [60, 0], status: "failed", target: aBuildTarget }, ...common },
    ]);
  });

  it("creates a summary entry", () => {
    const rawLogs: unknown[] = [];
    jest.spyOn(console, "log").mockImplementation((message: string) => {
      rawLogs.push(JSON.parse(message));
    });

    const reporter = new JsonReporter({ logLevel: LogLevel.verbose, indented: false });

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
      reporter.log({ data, level: LogLevel.verbose, msg: message ?? "", timestamp: 0 });
    }

    // reset! we only want to capture the output by `summarize()`
    rawLogs.splice(0);

    const summary = createSummary({
      failed: [aBuildTarget],
      success: [aTestTarget, bBuildTarget],
    });
    reporter.summarize(summary);

    expect(rawLogs).toEqual([
      {
        summary: {
          duration: "100.00",
          failedTargets: 1,
          successTargets: 2,
          taskStats: [
            { duration: "60.00", package: "a", status: "failed", task: "build" },
            { duration: "60.00", package: "a", status: "success", task: "test" },
            { duration: "60.00", package: "b", status: "success", task: "build" },
          ],
        },
      },
    ]);
  });
});
