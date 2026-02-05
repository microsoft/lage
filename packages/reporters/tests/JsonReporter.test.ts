import { LogLevel } from "@lage-run/logger";
import type { TargetRun } from "@lage-run/scheduler-types";
import { JsonReporter } from "../src/JsonReporter.js";
import type { TargetMessageEntry, TargetStatusEntry } from "../src/types/TargetLogEntry.js";

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

describe("JsonReporter", () => {
  it("logs both status and message entries", () => {
    const rawLogs: string[] = [];
    jest.spyOn(console, "log").mockImplementation((message: string) => {
      rawLogs.push(JSON.parse(message));
    });

    const reporter = new JsonReporter({ logLevel: LogLevel.verbose, indented: false });

    const aBuildTarget = createTarget("a", "build");
    const aTestTarget = createTarget("a", "test");
    const bBuildTarget = createTarget("b", "build");

    const logs = [
      [{ target: aBuildTarget, status: "running", duration: [0, 0], startTime: [0, 0], queueTime: [0, 0] }],
      [{ target: aTestTarget, status: "running", duration: [0, 0], startTime: [1, 0], queueTime: [0, 0] }],
      [{ target: bBuildTarget, status: "running", duration: [0, 0], startTime: [2, 0], queueTime: [0, 0] }],
      [{ target: aBuildTarget, pid: 1 }, "test message for a#build"],
      [{ target: aTestTarget, pid: 1 }, "test message for a#test"],
      [{ target: aBuildTarget, pid: 1 }, "test message for a#build again"],
      [{ target: bBuildTarget, pid: 1 }, "test message for b#build"],
      [{ target: aTestTarget, pid: 1 }, "test message for a#test again"],
      [{ target: bBuildTarget, pid: 1 }, "test message for b#build again"],
      [{ target: aTestTarget, status: "success", duration: [10, 0], startTime: [0, 0], queueTime: [0, 0] }],
      [{ target: bBuildTarget, status: "success", duration: [30, 0], startTime: [2, 0], queueTime: [0, 0] }],
      [{ target: aBuildTarget, status: "failed", duration: [60, 0], startTime: [1, 0], queueTime: [0, 0] }],
    ] as [TargetStatusEntry | TargetMessageEntry, string?][];

    for (const log of logs) {
      reporter.log({
        data: log[0],
        level: LogLevel.verbose,
        msg: log[1] ?? "",
        timestamp: 0,
      });
    }

    expect(rawLogs).toMatchInlineSnapshot(`
      [
        {
          "data": {
            "duration": [
              0,
              0,
            ],
            "queueTime": [
              0,
              0,
            ],
            "startTime": [
              0,
              0,
            ],
            "status": "running",
            "target": {
              "cwd": "/repo/root/packages/a",
              "depSpecs": [],
              "dependencies": [],
              "dependents": [],
              "id": "a#build",
              "label": "a - build",
              "packageName": "a",
              "task": "build",
            },
          },
          "level": 40,
          "msg": "",
          "timestamp": 0,
        },
        {
          "data": {
            "duration": [
              0,
              0,
            ],
            "queueTime": [
              0,
              0,
            ],
            "startTime": [
              1,
              0,
            ],
            "status": "running",
            "target": {
              "cwd": "/repo/root/packages/a",
              "depSpecs": [],
              "dependencies": [],
              "dependents": [],
              "id": "a#test",
              "label": "a - test",
              "packageName": "a",
              "task": "test",
            },
          },
          "level": 40,
          "msg": "",
          "timestamp": 0,
        },
        {
          "data": {
            "duration": [
              0,
              0,
            ],
            "queueTime": [
              0,
              0,
            ],
            "startTime": [
              2,
              0,
            ],
            "status": "running",
            "target": {
              "cwd": "/repo/root/packages/b",
              "depSpecs": [],
              "dependencies": [],
              "dependents": [],
              "id": "b#build",
              "label": "b - build",
              "packageName": "b",
              "task": "build",
            },
          },
          "level": 40,
          "msg": "",
          "timestamp": 0,
        },
        {
          "data": {
            "pid": 1,
            "target": {
              "cwd": "/repo/root/packages/a",
              "depSpecs": [],
              "dependencies": [],
              "dependents": [],
              "id": "a#build",
              "label": "a - build",
              "packageName": "a",
              "task": "build",
            },
          },
          "level": 40,
          "msg": "test message for a#build",
          "timestamp": 0,
        },
        {
          "data": {
            "pid": 1,
            "target": {
              "cwd": "/repo/root/packages/a",
              "depSpecs": [],
              "dependencies": [],
              "dependents": [],
              "id": "a#test",
              "label": "a - test",
              "packageName": "a",
              "task": "test",
            },
          },
          "level": 40,
          "msg": "test message for a#test",
          "timestamp": 0,
        },
        {
          "data": {
            "pid": 1,
            "target": {
              "cwd": "/repo/root/packages/a",
              "depSpecs": [],
              "dependencies": [],
              "dependents": [],
              "id": "a#build",
              "label": "a - build",
              "packageName": "a",
              "task": "build",
            },
          },
          "level": 40,
          "msg": "test message for a#build again",
          "timestamp": 0,
        },
        {
          "data": {
            "pid": 1,
            "target": {
              "cwd": "/repo/root/packages/b",
              "depSpecs": [],
              "dependencies": [],
              "dependents": [],
              "id": "b#build",
              "label": "b - build",
              "packageName": "b",
              "task": "build",
            },
          },
          "level": 40,
          "msg": "test message for b#build",
          "timestamp": 0,
        },
        {
          "data": {
            "pid": 1,
            "target": {
              "cwd": "/repo/root/packages/a",
              "depSpecs": [],
              "dependencies": [],
              "dependents": [],
              "id": "a#test",
              "label": "a - test",
              "packageName": "a",
              "task": "test",
            },
          },
          "level": 40,
          "msg": "test message for a#test again",
          "timestamp": 0,
        },
        {
          "data": {
            "pid": 1,
            "target": {
              "cwd": "/repo/root/packages/b",
              "depSpecs": [],
              "dependencies": [],
              "dependents": [],
              "id": "b#build",
              "label": "b - build",
              "packageName": "b",
              "task": "build",
            },
          },
          "level": 40,
          "msg": "test message for b#build again",
          "timestamp": 0,
        },
        {
          "data": {
            "duration": [
              10,
              0,
            ],
            "queueTime": [
              0,
              0,
            ],
            "startTime": [
              0,
              0,
            ],
            "status": "success",
            "target": {
              "cwd": "/repo/root/packages/a",
              "depSpecs": [],
              "dependencies": [],
              "dependents": [],
              "id": "a#test",
              "label": "a - test",
              "packageName": "a",
              "task": "test",
            },
          },
          "level": 40,
          "msg": "",
          "timestamp": 0,
        },
        {
          "data": {
            "duration": [
              30,
              0,
            ],
            "queueTime": [
              0,
              0,
            ],
            "startTime": [
              2,
              0,
            ],
            "status": "success",
            "target": {
              "cwd": "/repo/root/packages/b",
              "depSpecs": [],
              "dependencies": [],
              "dependents": [],
              "id": "b#build",
              "label": "b - build",
              "packageName": "b",
              "task": "build",
            },
          },
          "level": 40,
          "msg": "",
          "timestamp": 0,
        },
        {
          "data": {
            "duration": [
              60,
              0,
            ],
            "queueTime": [
              0,
              0,
            ],
            "startTime": [
              1,
              0,
            ],
            "status": "failed",
            "target": {
              "cwd": "/repo/root/packages/a",
              "depSpecs": [],
              "dependencies": [],
              "dependents": [],
              "id": "a#build",
              "label": "a - build",
              "packageName": "a",
              "task": "build",
            },
          },
          "level": 40,
          "msg": "",
          "timestamp": 0,
        },
      ]
    `);
  });

  it("creates a summary entry", () => {
    const rawLogs: string[] = [];
    jest.spyOn(console, "log").mockImplementation((message: string) => {
      rawLogs.push(JSON.parse(message));
    });

    const reporter = new JsonReporter({ logLevel: LogLevel.verbose, indented: false });

    const aBuildTarget = createTarget("a", "build");
    const aTestTarget = createTarget("a", "test");
    const bBuildTarget = createTarget("b", "build");

    const logs = [
      [{ target: aBuildTarget, status: "running", duration: [0, 0], startTime: [0, 0], queueTime: [0, 0] }],
      [{ target: aTestTarget, status: "running", duration: [0, 0], startTime: [1, 0], queueTime: [0, 0] }],
      [{ target: bBuildTarget, status: "running", duration: [0, 0], startTime: [2, 0], queueTime: [0, 0] }],
      [{ target: aBuildTarget, pid: 1 }, "test message for a#build"],
      [{ target: aTestTarget, pid: 1 }, "test message for a#test"],
      [{ target: aBuildTarget, pid: 1 }, "test message for a#build again"],
      [{ target: bBuildTarget, pid: 1 }, "test message for b#build"],
      [{ target: aTestTarget, pid: 1 }, "test message for a#test again"],
      [{ target: bBuildTarget, pid: 1 }, "test message for b#build again"],
      [{ target: aTestTarget, status: "success", duration: [10, 0], startTime: [0, 0], queueTime: [0, 0] }],
      [{ target: bBuildTarget, status: "success", duration: [30, 0], startTime: [2, 0], queueTime: [0, 0] }],
      [{ target: aBuildTarget, status: "failed", duration: [60, 0], startTime: [1, 0], queueTime: [0, 0] }],
    ] as [TargetStatusEntry | TargetMessageEntry, string?][];

    for (const log of logs) {
      reporter.log({
        data: log[0],
        level: LogLevel.verbose,
        msg: log[1] ?? "",
        timestamp: 0,
      });
    }

    // reset! we only want to capture the output by `summarize()`
    rawLogs.splice(0);

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
      targetRuns: new Map<string, TargetRun<unknown>>([
        [aBuildTarget.id, { target: aBuildTarget, status: "failed", duration: [60, 0], startTime: [1, 0], queueTime: [0, 0], threadId: 0 }],
        [aTestTarget.id, { target: aTestTarget, status: "success", duration: [60, 0], startTime: [1, 0], queueTime: [0, 0], threadId: 0 }],
        [
          bBuildTarget.id,
          { target: bBuildTarget, status: "success", duration: [60, 0], startTime: [1, 0], queueTime: [0, 0], threadId: 0 },
        ],
      ]),
      maxWorkerMemoryUsage: 0,
      workerRestarts: 0,
    });

    expect(rawLogs).toEqual([
      {
        summary: {
          duration: "100.00",
          failedTargets: 1,
          successTargets: 2,
          taskStats: [
            {
              duration: "60.00",
              package: "a",
              status: "failed",
              task: "build",
            },
            {
              duration: "60.00",
              package: "a",
              status: "success",
              task: "test",
            },
            {
              duration: "60.00",
              package: "b",
              status: "success",
              task: "build",
            },
          ],
        },
      },
    ]);
  });
});
