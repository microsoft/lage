import { LogLevel, type LogEntry } from "@lage-run/logger";
import streams from "memory-streams";
import { VerboseFileLogReporter } from "../VerboseFileLogReporter.js";
import type { TargetMessageEntry, TargetStatusEntry } from "../types/TargetLogEntry.js";
import { writerToString } from "./writerToString.js";

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

describe("VerboseFileLogReporter", () => {
  it("records a target status entry", () => {
    const writer = new streams.WritableStream();
    const reporter = new VerboseFileLogReporter();
    reporter.fileStream = writer;

    const entry: LogEntry<any> = {
      data: {
        target: createTarget("@madeUp/avettLyrics", "generateLyrics"),
        status: "running",
        duration: [0, 0],
        startTime: [0, 0],
      } as TargetStatusEntry,
      level: LogLevel.verbose,
      msg: "Be loud. Let your colors show!",
      timestamp: 0,
    };
    reporter.log(entry);
    writer.end();

    expect(writerToString(writer)).toMatchInlineSnapshot(`
      "[:${entry.data.target.id}:] @madeUp/avettLyrics generateLyrics ➔ start
      "
    `);
  });

  it("records a target message entry", () => {
    const writer = new streams.WritableStream();
    const reporter = new VerboseFileLogReporter();
    reporter.fileStream = writer;

    const entry: LogEntry<any> = {
      data: {
        target: createTarget("@madeUp/avettLyrics", "generateLyrics"),
        pid: 1,
      } as TargetMessageEntry,
      level: LogLevel.verbose,
      msg: "Be loud. Let your colors show!",
      timestamp: 0,
    };
    reporter.log(entry);
    writer.end();

    expect(writerToString(writer)).toMatchInlineSnapshot(`
      "[:${entry.data.target.id}:] @madeUp/avettLyrics generateLyrics : Be loud. Let your colors show!
      "
    `);
  });

  it("prefixes target entries with the target id", () => {
    const writer = new streams.WritableStream();
    const reporter = new VerboseFileLogReporter();
    reporter.fileStream = writer;

    const entry: LogEntry<any> = {
      data: {
        target: createTarget("@madeUp/avettLyrics", "generateLyrics"),
        pid: 1,
      } as TargetMessageEntry,
      level: LogLevel.verbose,
      msg: "I've got something to say, but it's all vanity.",
      timestamp: 0,
    };
    entry.data.target.id = "I love the Avett Brothers!";
    reporter.log(entry);
    writer.end();

    expect(writerToString(writer)).toMatchInlineSnapshot(`
      "[:I love the Avett Brothers!:] @madeUp/avettLyrics generateLyrics : I've got something to say, but it's all vanity.
      "
    `);
  });

  it("does not prefix non-target entries with target id", () => {
    const writer = new streams.WritableStream();
    const reporter = new VerboseFileLogReporter();
    reporter.fileStream = writer;

    const entry: LogEntry<any> = {
      level: LogLevel.verbose,
      msg: "For every year of knowledge gained, there's a negative year I've earned.",
      timestamp: 0,
    };
    reporter.log(entry);
    writer.end();

    expect(writerToString(writer)).toMatchInlineSnapshot(`
      "For every year of knowledge gained, there's a negative year I've earned.
      "
    `);
  });

  it("never groups messages together", () => {
    const writer = new streams.WritableStream();
    const reporter = new VerboseFileLogReporter();
    reporter.fileStream = writer;

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
        msg: log[1] ?? "empty message",
        timestamp: 0,
      });
    }

    writer.end();

    expect(writerToString(writer)).toMatchInlineSnapshot(`
      "[:${aBuildTarget.id}:] a build ➔ start
      [:${aTestTarget.id}:] a test ➔ start
      [:${bBuildTarget.id}:] b build ➔ start
      [:${aBuildTarget.id}:] a build : test message for a#build
      [:${aTestTarget.id}:] a test : test message for a#test
      [:${aBuildTarget.id}:] a build : test message for a#build again
      [:${bBuildTarget.id}:] b build : test message for b#build
      [:${aTestTarget.id}:] a test : test message for a#test again
      [:${bBuildTarget.id}:] b build : test message for b#build again
      [:${aTestTarget.id}:] a test ✓ done - 10.00s
      [:${bBuildTarget.id}:] b build ✓ done - 30.00s
      [:${aBuildTarget.id}:] a build ✖ fail
      "
    `);
  });

  it("always records messages with logLevel verbose or lower", () => {
    const writer = new streams.WritableStream();
    const reporter = new VerboseFileLogReporter();
    reporter.fileStream = writer;

    const entry1: LogEntry<any> = {
      level: LogLevel.info,
      msg: "Well my speed meter don't work, so I'm gonna guess 95.",
      timestamp: 0,
    };
    const entry2: LogEntry<any> = {
      level: LogLevel.warn,
      msg: "Well maybe I'll fix it, and maybe I won't; it depend on my being alive.",
      timestamp: 0,
    };
    const entry3: LogEntry<any> = {
      level: LogLevel.error,
      msg: "Well my '63 Ford is a bull, she's 4000 lbs at least.",
      timestamp: 0,
    };
    const entry4: LogEntry<any> = {
      level: LogLevel.verbose,
      msg: "But metal surrenders when oak trees meet fenders, and engines go through the front seats.",
      timestamp: 0,
    };
    reporter.log(entry1);
    reporter.log(entry2);
    reporter.log(entry3);
    reporter.log(entry4);
    writer.end();

    expect(writerToString(writer)).toMatchInlineSnapshot(`
      "Well my speed meter don't work, so I'm gonna guess 95.
      Well maybe I'll fix it, and maybe I won't; it depend on my being alive.
      Well my '63 Ford is a bull, she's 4000 lbs at least.
      But metal surrenders when oak trees meet fenders, and engines go through the front seats.
      "
    `);
  });
});
