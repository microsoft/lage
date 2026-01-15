import fs from "fs";
import path from "path";
import os from "os";
import { Logger } from "@lage-run/logger";
import { AdoReporter, BasicReporter, ChromeTraceEventsReporter, LogReporter } from "@lage-run/reporters";
import { initializeReporters } from "../src/commands/initializeReporters.js";
import isInteractive from "is-interactive";

jest.mock("is-interactive", () => jest.fn(() => true));

describe("initializeReporters", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lage-"));
  });

  afterAll(() => {
    fs.rmdirSync(tmpDir, { recursive: true });
  });

  it("should initialize progress reporter when param is progress passed as true", async () => {
    const logger = new Logger();
    const reporters = await initializeReporters(logger, {
      concurrency: 1,
      grouped: false,
      logLevel: "info",
      progress: true,
      reporter: [],
      verbose: false,
    });

    expect(reporters.length).toBe(1);
    expect(reporters).toContainEqual(expect.any(BasicReporter));
  });

  it("should initialize old reporter when shell is not interactive", async () => {
    (isInteractive as jest.Mock).mockReturnValueOnce(false);
    const logger = new Logger();
    const reporters = await initializeReporters(logger, {
      concurrency: 1,
      grouped: false,
      logLevel: "info",
      progress: true,
      reporter: [],
      verbose: false,
    });

    expect(reporters.length).toBe(1);
    expect(reporters).toContainEqual(expect.any(LogReporter));
  });

  it("should initialize old reporter when grouped", async () => {
    const logger = new Logger();
    const reporters = await initializeReporters(logger, {
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

  it("should initialize old reporter when verbose", async () => {
    const logger = new Logger();
    const reporters = await initializeReporters(logger, {
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

  it("should initialize profile reporter", async () => {
    const logger = new Logger();
    const reporters = await initializeReporters(logger, {
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

  it("should initialize ADO reporter when reporter arg is adoLog", async () => {
    const logger = new Logger();
    const reporters = await initializeReporters(logger, {
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
