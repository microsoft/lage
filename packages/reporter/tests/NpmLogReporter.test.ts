import { LogEntry, LogLevel } from "@lage-run/logger";
import { NpmLogReporter } from "../src/NpmLogReporter";
import { TargetStatusEntry } from "../src/types/TargetLogEntry";
import streams from "memory-streams";

describe("NpmLogReporter", () => {
  it("records a target status entry", () => {
    const writer = new streams.WritableStream();

    const reporter = new NpmLogReporter({ grouped: false, logLevel: LogLevel.verbose });
    reporter.npmLog.stream = writer;

    const entry = {
      data: {
        target: {
          id: "a#task",
          cwd: "/repo/root",
          dependencies: [],
          packageName: "package-a",
          task: "task",
          label: "a#task",
        },
        status: "running",
        duration: [0, 0],
        startTime: [0, 0],
      },
      level: LogLevel.verbose,
      msg: "test message",
      timestamp: 0,
      duration: [0, 0],
    } as LogEntry<TargetStatusEntry>;

    reporter.log(entry);

    writer.end();
    
    expect(writer.toString()).toMatchInlineSnapshot(`
"verb [35mpackage-a[39m [36mtask[39m [90m[32m➔[39m[90m start [39m
"
`);
  });
});
