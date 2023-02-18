import { LogLevel } from "@lage-run/logger";
import { ChromeTraceEventsReporter } from "../src/ChromeTraceEventsReporter";
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
        [aBuildTarget.id, { target: aBuildTarget, status: "failed", duration: [60, 0], startTime: [0, 0], queueTime: [0, 0], threadId: 1 }],
        [aTestTarget.id, { target: aTestTarget, status: "success", duration: [10, 0], startTime: [1, 0], queueTime: [0, 0], threadId: 2 }],
        [
          bBuildTarget.id,
          { target: bBuildTarget, status: "success", duration: [30, 0], startTime: [2, 0], queueTime: [0, 0], threadId: 3 },
        ],
      ]),
      maxWorkerMemoryUsage: 0,
      workerRestarts: 0,
    });

    writer.end();
    consoleWriter.end();

    expect(writer.toString()).toMatchInlineSnapshot(`
      "{
        "traceEvents": [
          {
            "name": "a#build",
            "cat": "failed#build",
            "ph": "X",
            "ts": 0,
            "dur": 60000000,
            "pid": 1,
            "tid": 1
          },
          {
            "name": "a#test",
            "cat": "success#test",
            "ph": "X",
            "ts": 1000000,
            "dur": 10000000,
            "pid": 1,
            "tid": 2
          },
          {
            "name": "b#build",
            "cat": "success#build",
            "ph": "X",
            "ts": 2000000,
            "dur": 30000000,
            "pid": 1,
            "tid": 3
          }
        ],
        "displayTimeUnit": "ms"
      }"
    `);
    expect(consoleWriter.toString()).toMatchInlineSnapshot(`
      "
      Profiler output written to profile.json, open it with chrome://tracing or edge://tracing
      "
    `);
  });
});
