import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { createTempDir, removeTempDir } from "@lage-run/test-utilities";
import fs from "fs";
import path from "path";
import { ChromeTraceEventsReporter } from "../ChromeTraceEventsReporter.js";
import { createSummary, createTarget } from "./helpers.js";
import { MemoryStream } from "./MemoryStream.js";

describe("ChromeTraceEventsReporter", () => {
  let tmpDir: string;
  let outputFile: string;

  beforeEach(() => {
    tmpDir = createTempDir({ prefix: "lage-reporter-test-" });
    outputFile = path.join(tmpDir, "profile.json");
  });

  afterEach(() => {
    removeTempDir(tmpDir);
  });

  it("can group verbose messages, displaying summary", () => {
    const writer = new MemoryStream();

    const reporter = new ChromeTraceEventsReporter({ concurrency: 4, outputFile, consoleLogStream: writer });

    const aBuildTarget = createTarget("a", "build");
    const aTestTarget = createTarget("a", "test");
    const bBuildTarget = createTarget("b", "build");

    const summary = createSummary({
      failed: [aBuildTarget],
      success: [aTestTarget, bBuildTarget],
    });
    reporter.summarize(summary);

    writer.end();

    const fileContent = fs.readFileSync(outputFile, "utf-8");
    expect(fileContent).toMatchInlineSnapshot(`
      "{
        "traceEvents": [
          {
            "name": "a#build",
            "cat": "failed#build",
            "ph": "X",
            "ts": 5000000,
            "dur": 60000000,
            "pid": 1,
            "tid": 1
          },
          {
            "name": "a#test",
            "cat": "success#test",
            "ph": "X",
            "ts": 5000000,
            "dur": 60000000,
            "pid": 1,
            "tid": 1
          },
          {
            "name": "b#build",
            "cat": "success#build",
            "ph": "X",
            "ts": 5000000,
            "dur": 60000000,
            "pid": 1,
            "tid": 1
          }
        ],
        "displayTimeUnit": "ms"
      }"
    `);
    expect(writer.getOutput()).toMatchInlineSnapshot(`
      "
      Profiler output written to ${outputFile}, open it with chrome://tracing or edge://tracing
      "
    `);
  });
});
