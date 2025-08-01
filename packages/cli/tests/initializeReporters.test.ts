import fs from "fs";
import path from "path";
import os from "os";
import { Logger, LogStructuredData, Reporter } from "@lage-run/logger";
import { AdoReporter, ChromeTraceEventsReporter, LogReporter, ProgressReporter } from "@lage-run/reporters";
import { initializeReporters } from "../src/commands/initializeReporters.js";

describe("initializeReporters", () => {
  let tmpDir: string;
  let reporters: Reporter<LogStructuredData>[] | undefined;

  afterEach(() => {
    reporters.forEach((r) => r.cleanup?.());
    reporters = undefined;
  });

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lage-"));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  });

  it("should initialize progress reporter when param is progress passed as true", () => {
    const logger = new Logger();
    reporters = initializeReporters(logger, {
      concurrency: 1,
      grouped: false,
      logLevel: "info",
      progress: true,
      reporter: [],
      verbose: false,
    });

    expect(reporters.length).toBe(1);
    expect(reporters).toContainEqual(expect.any(ProgressReporter));
  });

  it("should initialize old reporter when grouped", () => {
    const logger = new Logger();
    reporters = initializeReporters(logger, {
      concurrency: 1,
      grouped: true,
      logLevel: "info",
      progress: false,
      reporter: [],
      verbose: false,
    });
    expect(reporters.length).toBe(1);
    expect(reporters).toContainEqual(expect.any(LogReporter));
  });

  it("should initialize old reporter when verbose", () => {
    const logger = new Logger();
    reporters = initializeReporters(logger, {
      concurrency: 1,
      grouped: false,
      logLevel: "info",
      progress: false,
      reporter: [],
      verbose: true,
    });
    expect(reporters.length).toBe(1);
    expect(reporters).toContainEqual(expect.any(LogReporter));
  });

  it("should initialize profile reporter", () => {
    const logger = new Logger();
    reporters = initializeReporters(logger, {
      concurrency: 1,
      grouped: false,
      logLevel: "info",
      progress: true,
      reporter: [],
      verbose: false,
      profile: path.join(tmpDir, "profile.json"),
    });

    expect(reporters.length).toBe(2);
    expect(reporters).toContainEqual(expect.any(ChromeTraceEventsReporter));
  });

  it("should initialize ADO reporter when reporter arg is adoLog", () => {
    const logger = new Logger();
    reporters = initializeReporters(logger, {
      concurrency: 1,
      grouped: false,
      logLevel: "info",
      progress: false,
      reporter: ["adoLog"],
      verbose: false,
    });
    expect(reporters.length).toBe(1);
    expect(reporters).toContainEqual(expect.any(AdoReporter));
  });
});
