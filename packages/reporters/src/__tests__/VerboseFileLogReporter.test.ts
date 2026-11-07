import { describe, expect, it } from "@jest/globals";
import { LogLevel, type LogEntry } from "@lage-run/logger";
import type { TargetStatus } from "@lage-run/scheduler-types";
import { statusColorFn } from "../LogReporter.js";
import type { TargetData, TargetLogData, TargetStatusData } from "../types/TargetLogData.js";
import { VerboseFileLogReporter } from "../VerboseFileLogReporter.js";
import { createTarget } from "./helpers.js";
import { MemoryStream } from "./MemoryStream.js";

describe("VerboseFileLogReporter", () => {
  it("records a target status entry", () => {
    const writer = new MemoryStream();
    const reporter = new VerboseFileLogReporter({ fileStream: writer });
    const target = createTarget("@madeUp/avettLyrics", "generateLyrics");
    const allStatuses = Object.keys(statusColorFn) as TargetStatus[];

    for (const status of allStatuses) {
      reporter.log({
        data: { target, status, duration: [0, 0] } satisfies TargetStatusData,
        level: LogLevel.verbose,
        msg: "Be loud. Let your colors show!",
        timestamp: 0,
      });
    }

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "[:@madeUp/avettLyrics#generateLyrics:] @madeUp/avettLyrics generateLyrics ✓ done - 0.00s
      [:@madeUp/avettLyrics#generateLyrics:] @madeUp/avettLyrics generateLyrics ✖ fail
      [:@madeUp/avettLyrics#generateLyrics:] @madeUp/avettLyrics generateLyrics » skip - undefined
      [:@madeUp/avettLyrics#generateLyrics:] @madeUp/avettLyrics generateLyrics ➔ start
      [:@madeUp/avettLyrics#generateLyrics:] @madeUp/avettLyrics generateLyrics … pending
      [:@madeUp/avettLyrics#generateLyrics:] @madeUp/avettLyrics generateLyrics - aborted
      [:@madeUp/avettLyrics#generateLyrics:] @madeUp/avettLyrics generateLyrics … queued
      "
    `);
  });

  it("records a target message entry", () => {
    const writer = new MemoryStream();
    const reporter = new VerboseFileLogReporter({ fileStream: writer });

    const entry: LogEntry<any> = {
      data: {
        target: createTarget("@madeUp/avettLyrics", "generateLyrics"),
      } satisfies TargetData,
      level: LogLevel.verbose,
      msg: "Be loud. Let your colors show!",
      timestamp: 0,
    };
    reporter.log(entry);

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "[:${entry.data.target.id}:] @madeUp/avettLyrics generateLyrics : Be loud. Let your colors show!
      "
    `);
  });

  it("prefixes target entries with the target id", () => {
    const writer = new MemoryStream();
    const reporter = new VerboseFileLogReporter({ fileStream: writer });

    const entry: LogEntry<any> = {
      data: {
        target: createTarget("@madeUp/avettLyrics", "generateLyrics"),
      } satisfies TargetData,
      level: LogLevel.verbose,
      msg: "I've got something to say, but it's all vanity.",
      timestamp: 0,
    };
    entry.data.target.id = "I love the Avett Brothers!";
    reporter.log(entry);

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "[:I love the Avett Brothers!:] @madeUp/avettLyrics generateLyrics : I've got something to say, but it's all vanity.
      "
    `);
  });

  it("does not prefix non-target entries with target id", () => {
    const writer = new MemoryStream();
    const reporter = new VerboseFileLogReporter({ fileStream: writer });

    const entry: LogEntry<any> = {
      level: LogLevel.verbose,
      msg: "For every year of knowledge gained, there's a negative year I've earned.",
      timestamp: 0,
    };
    reporter.log(entry);

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "For every year of knowledge gained, there's a negative year I've earned.
      "
    `);
  });

  it("never groups messages together", () => {
    const writer = new MemoryStream();
    const reporter = new VerboseFileLogReporter({ fileStream: writer });

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

    for (const log of logs) {
      reporter.log({
        data: log[0],
        level: LogLevel.verbose,
        msg: log[1] ?? "empty message",
        timestamp: 0,
      });
    }

    writer.end();

    expect(writer.getOutput()).toMatchInlineSnapshot(`
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
    const writer = new MemoryStream();
    const reporter = new VerboseFileLogReporter({ fileStream: writer });

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

    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "Well my speed meter don't work, so I'm gonna guess 95.
      Well maybe I'll fix it, and maybe I won't; it depend on my being alive.
      Well my '63 Ford is a bull, she's 4000 lbs at least.
      But metal surrenders when oak trees meet fenders, and engines go through the front seats.
      "
    `);
  });
});
