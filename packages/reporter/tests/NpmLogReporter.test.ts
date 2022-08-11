import { LogEntry, LogLevel } from "@lage-run/logger";
import { NpmLogReporter } from "../src/NpmLogReporter";
import { TargetStatusEntry } from "../src/types/TargetLogEntry";

describe("NpmLogReporter", () => {
  it("display success", () => {
    const reporter = new NpmLogReporter({ logLevel: LogLevel.info });
    const entry = {
      target: {
        packageName: "package-a",
        task: "task",
      },
      level: LogLevel.info,
      msg: "test message",
      timestamp: 0,
      status: "success",
      duration: [0, 0],
    } as LogEntry<TargetStatusEntry>;
    reporter.log(entry);
  });
});
