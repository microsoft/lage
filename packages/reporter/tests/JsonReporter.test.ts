// For this test, we need have a force color set before any imports
process.env.FORCE_COLOR = "0";

import { LogLevel } from "@lage-run/logger";
import { JsonReporter } from "../src/JsonReporter";
import streams from "memory-streams";
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
    jest.spyOn(console, "log").mockImplementation((first: string, ...args: any[]) => {
      rawLogs.push(format(first, args));
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

    rawLogs.join("\n");

    expect(rawLogs).toMatchInlineSnapshot(`
      Array [
        "{\\"data\\":{\\"target\\":{\\"id\\":\\"a#build\\",\\"cwd\\":\\"/repo/root/packages/a\\",\\"dependencies\\":[],\\"packageName\\":\\"a\\",\\"task\\":\\"build\\",\\"label\\":\\"a - build\\"},\\"status\\":\\"running\\",\\"duration\\":[0,0],\\"startTime\\":[0,0]},\\"level\\":40,\\"msg\\":\\"\\",\\"timestamp\\":0} []",
        "{\\"data\\":{\\"target\\":{\\"id\\":\\"a#test\\",\\"cwd\\":\\"/repo/root/packages/a\\",\\"dependencies\\":[],\\"packageName\\":\\"a\\",\\"task\\":\\"test\\",\\"label\\":\\"a - test\\"},\\"status\\":\\"running\\",\\"duration\\":[0,0],\\"startTime\\":[1,0]},\\"level\\":40,\\"msg\\":\\"\\",\\"timestamp\\":0} []",
        "{\\"data\\":{\\"target\\":{\\"id\\":\\"b#build\\",\\"cwd\\":\\"/repo/root/packages/b\\",\\"dependencies\\":[],\\"packageName\\":\\"b\\",\\"task\\":\\"build\\",\\"label\\":\\"b - build\\"},\\"status\\":\\"running\\",\\"duration\\":[0,0],\\"startTime\\":[2,0]},\\"level\\":40,\\"msg\\":\\"\\",\\"timestamp\\":0} []",
        "{\\"data\\":{\\"target\\":{\\"id\\":\\"a#build\\",\\"cwd\\":\\"/repo/root/packages/a\\",\\"dependencies\\":[],\\"packageName\\":\\"a\\",\\"task\\":\\"build\\",\\"label\\":\\"a - build\\"},\\"pid\\":1},\\"level\\":40,\\"msg\\":\\"test message for a#build\\",\\"timestamp\\":0} []",
        "{\\"data\\":{\\"target\\":{\\"id\\":\\"a#test\\",\\"cwd\\":\\"/repo/root/packages/a\\",\\"dependencies\\":[],\\"packageName\\":\\"a\\",\\"task\\":\\"test\\",\\"label\\":\\"a - test\\"},\\"pid\\":1},\\"level\\":40,\\"msg\\":\\"test message for a#test\\",\\"timestamp\\":0} []",
        "{\\"data\\":{\\"target\\":{\\"id\\":\\"a#build\\",\\"cwd\\":\\"/repo/root/packages/a\\",\\"dependencies\\":[],\\"packageName\\":\\"a\\",\\"task\\":\\"build\\",\\"label\\":\\"a - build\\"},\\"pid\\":1},\\"level\\":40,\\"msg\\":\\"test message for a#build again\\",\\"timestamp\\":0} []",
        "{\\"data\\":{\\"target\\":{\\"id\\":\\"b#build\\",\\"cwd\\":\\"/repo/root/packages/b\\",\\"dependencies\\":[],\\"packageName\\":\\"b\\",\\"task\\":\\"build\\",\\"label\\":\\"b - build\\"},\\"pid\\":1},\\"level\\":40,\\"msg\\":\\"test message for b#build\\",\\"timestamp\\":0} []",
        "{\\"data\\":{\\"target\\":{\\"id\\":\\"a#test\\",\\"cwd\\":\\"/repo/root/packages/a\\",\\"dependencies\\":[],\\"packageName\\":\\"a\\",\\"task\\":\\"test\\",\\"label\\":\\"a - test\\"},\\"pid\\":1},\\"level\\":40,\\"msg\\":\\"test message for a#test again\\",\\"timestamp\\":0} []",
        "{\\"data\\":{\\"target\\":{\\"id\\":\\"b#build\\",\\"cwd\\":\\"/repo/root/packages/b\\",\\"dependencies\\":[],\\"packageName\\":\\"b\\",\\"task\\":\\"build\\",\\"label\\":\\"b - build\\"},\\"pid\\":1},\\"level\\":40,\\"msg\\":\\"test message for b#build again\\",\\"timestamp\\":0} []",
        "{\\"data\\":{\\"target\\":{\\"id\\":\\"a#test\\",\\"cwd\\":\\"/repo/root/packages/a\\",\\"dependencies\\":[],\\"packageName\\":\\"a\\",\\"task\\":\\"test\\",\\"label\\":\\"a - test\\"},\\"status\\":\\"success\\",\\"duration\\":[10,0],\\"startTime\\":[0,0]},\\"level\\":40,\\"msg\\":\\"\\",\\"timestamp\\":0} []",
        "{\\"data\\":{\\"target\\":{\\"id\\":\\"b#build\\",\\"cwd\\":\\"/repo/root/packages/b\\",\\"dependencies\\":[],\\"packageName\\":\\"b\\",\\"task\\":\\"build\\",\\"label\\":\\"b - build\\"},\\"status\\":\\"success\\",\\"duration\\":[30,0],\\"startTime\\":[2,0]},\\"level\\":40,\\"msg\\":\\"\\",\\"timestamp\\":0} []",
        "{\\"data\\":{\\"target\\":{\\"id\\":\\"a#build\\",\\"cwd\\":\\"/repo/root/packages/a\\",\\"dependencies\\":[],\\"packageName\\":\\"a\\",\\"task\\":\\"build\\",\\"label\\":\\"a - build\\"},\\"status\\":\\"failed\\",\\"duration\\":[60,0],\\"startTime\\":[1,0]},\\"level\\":40,\\"msg\\":\\"\\",\\"timestamp\\":0} []",
      ]
    `);
  });
});
