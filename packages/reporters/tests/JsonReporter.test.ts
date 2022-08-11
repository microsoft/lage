// For this test, we need have a force color set before any imports
process.env.FORCE_COLOR = "0";

import { LogLevel } from "@lage-run/logger";
import { JsonReporter } from "../src/JsonReporter";
import type { TargetMessageEntry, TargetStatusEntry } from "../src/types/TargetLogEntry";
import { format } from "util";

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

describe("JsonReporter", () => {
  it("logs both status and message entries", () => {
    let rawLogs: string[] = [];
    jest.spyOn(console, "log").mockImplementation((message: string) => {
      rawLogs.push(JSON.parse(message));
    });

    const reporter = new JsonReporter({ logLevel: LogLevel.verbose });

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
        msg: log[1] ?? "",
        timestamp: 0,
      });
    }

    expect(rawLogs).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {
            "duration": Array [
              0,
              0,
            ],
            "startTime": Array [
              0,
              0,
            ],
            "status": "running",
            "target": Object {
              "cwd": "/repo/root/packages/a",
              "dependencies": Array [],
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
        Object {
          "data": Object {
            "duration": Array [
              0,
              0,
            ],
            "startTime": Array [
              1,
              0,
            ],
            "status": "running",
            "target": Object {
              "cwd": "/repo/root/packages/a",
              "dependencies": Array [],
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
        Object {
          "data": Object {
            "duration": Array [
              0,
              0,
            ],
            "startTime": Array [
              2,
              0,
            ],
            "status": "running",
            "target": Object {
              "cwd": "/repo/root/packages/b",
              "dependencies": Array [],
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
        Object {
          "data": Object {
            "pid": 1,
            "target": Object {
              "cwd": "/repo/root/packages/a",
              "dependencies": Array [],
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
        Object {
          "data": Object {
            "pid": 1,
            "target": Object {
              "cwd": "/repo/root/packages/a",
              "dependencies": Array [],
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
        Object {
          "data": Object {
            "pid": 1,
            "target": Object {
              "cwd": "/repo/root/packages/a",
              "dependencies": Array [],
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
        Object {
          "data": Object {
            "pid": 1,
            "target": Object {
              "cwd": "/repo/root/packages/b",
              "dependencies": Array [],
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
        Object {
          "data": Object {
            "pid": 1,
            "target": Object {
              "cwd": "/repo/root/packages/a",
              "dependencies": Array [],
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
        Object {
          "data": Object {
            "pid": 1,
            "target": Object {
              "cwd": "/repo/root/packages/b",
              "dependencies": Array [],
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
        Object {
          "data": Object {
            "duration": Array [
              10,
              0,
            ],
            "startTime": Array [
              0,
              0,
            ],
            "status": "success",
            "target": Object {
              "cwd": "/repo/root/packages/a",
              "dependencies": Array [],
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
        Object {
          "data": Object {
            "duration": Array [
              30,
              0,
            ],
            "startTime": Array [
              2,
              0,
            ],
            "status": "success",
            "target": Object {
              "cwd": "/repo/root/packages/b",
              "dependencies": Array [],
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
        Object {
          "data": Object {
            "duration": Array [
              60,
              0,
            ],
            "startTime": Array [
              1,
              0,
            ],
            "status": "failed",
            "target": Object {
              "cwd": "/repo/root/packages/a",
              "dependencies": Array [],
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
    let rawLogs: string[] = [];
    jest.spyOn(console, "log").mockImplementation((message: string) => {
      rawLogs.push(JSON.parse(message));
    });

    const reporter = new JsonReporter({ logLevel: LogLevel.verbose });

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
      },
      targetRuns: new Map([
        [aBuildTarget.id, { target: aBuildTarget, status: "failed", duration: [60, 0], startTime: [1, 0] }],
        [aTestTarget.id, { target: aTestTarget, status: "success", duration: [60, 0], startTime: [1, 0] }],
        [bBuildTarget.id, { target: bBuildTarget, status: "success", duration: [60, 0], startTime: [1, 0] }],
      ]),
    });

    expect(rawLogs).toMatchInlineSnapshot(`
      Array [
        Object {
          "summary": Object {
            "duration": "100.00",
            "taskStats": Array [
              Object {
                "duration": "60.00",
                "package": "a",
                "status": "failed",
                "task": "build",
              },
              Object {
                "duration": "60.00",
                "package": "a",
                "status": "success",
                "task": "test",
              },
              Object {
                "duration": "60.00",
                "package": "b",
                "status": "success",
                "task": "build",
              },
            ],
          },
        },
      ]
    `);
  });
});
