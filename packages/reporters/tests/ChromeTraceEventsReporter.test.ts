// For this test, we need have a force color set before any imports
process.env.FORCE_COLOR = "0";

import { LogLevel } from "@lage-run/logger";
import { ChromeTraceEventsReporter } from "../src/ChromeTraceEventsReporter";
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

describe("ChromeTraceEventsReporter", () => {
  it("can group verbose messages, displaying summary", () => {
    const writer = new streams.WritableStream();
    const consoleWriter = new streams.WritableStream();

    const reporter = new ChromeTraceEventsReporter({ concurrency: 4, outputFile: "profile.json" });
    reporter.logStream = writer;
    reporter.consoleLogStream = consoleWriter;

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
        [aBuildTarget.id, { target: aBuildTarget, status: "failed", duration: [60, 0], startTime: [0, 0] }],
        [aTestTarget.id, { target: aTestTarget, status: "success", duration: [10, 0], startTime: [1, 0] }],
        [bBuildTarget.id, { target: bBuildTarget, status: "success", duration: [30, 0], startTime: [2, 0] }],
      ]),
    });

    writer.end();
    consoleWriter.end();

    expect(writer.toString()).toMatchInlineSnapshot(`
      "{
        \\"traceEvents\\": [
          {
            \\"name\\": \\"a#test\\",
            \\"cat\\": \\"success\\",
            \\"ph\\": \\"X\\",
            \\"ts\\": 1000000,
            \\"dur\\": 10000000,
            \\"pid\\": 1,
            \\"tid\\": 2
          },
          {
            \\"name\\": \\"b#build\\",
            \\"cat\\": \\"success\\",
            \\"ph\\": \\"X\\",
            \\"ts\\": 2000000,
            \\"dur\\": 30000000,
            \\"pid\\": 1,
            \\"tid\\": 3
          },
          {
            \\"name\\": \\"a#build\\",
            \\"cat\\": \\"failed\\",
            \\"ph\\": \\"X\\",
            \\"ts\\": 0,
            \\"dur\\": 60000000,
            \\"pid\\": 1,
            \\"tid\\": 1
          }
        ],
        \\"displayTimeUnit\\": \\"ms\\"
      }"
    `);
    expect(consoleWriter.toString()).toMatchInlineSnapshot(`
      "
      Profiler output written to profile.json, open it with chrome://tracing or edge://tracing
      "
    `);
  });
});
