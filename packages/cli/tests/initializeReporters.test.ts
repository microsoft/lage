import { Logger } from "@lage-run/logger";
import { AdoReporter, ChromeTraceEventsReporter, LogReporter, ProgressReporter } from "@lage-run/reporters";
import { initializeReporters } from "../src/commands/initializeReporters.js";

describe("initializeReporters", () => {
  it("should initialize progress reporter by default", () => {
    const logger = new Logger();
    const reporters = initializeReporters(logger, {
      concurrency: 1,
      grouped: false,
      logLevel: "info",
      progress: false,
      reporter: [],
      verbose: false,
    });

    expect(reporters.length).toBe(1);
    expect(reporters).toContainEqual(expect.any(ProgressReporter));
  });

  it("should initialize old reporter when grouped", () => {
    const logger = new Logger();
    const reporters = initializeReporters(logger, {
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
    const reporters = initializeReporters(logger, {
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
    const reporters = initializeReporters(logger, {
      concurrency: 1,
      grouped: false,
      logLevel: "info",
      progress: false,
      reporter: [],
      verbose: false,
      profile: true,
    });
    expect(reporters.length).toBe(2);
    expect(reporters).toContainEqual(expect.any(ChromeTraceEventsReporter));
    expect(reporters).toContainEqual(expect.any(ProgressReporter));
  });

  it("should initialize ADO reporter when reporter arg is adoLog", () => {
    const logger = new Logger();
    const reporters = initializeReporters(logger, {
      concurrency: 1,
      grouped: false,
      logLevel: "info",
      progress: false,
      reporter: ["adoLog"],
      verbose: false,
      profile: false,
    });
    expect(reporters.length).toBe(1);
    expect(reporters).toContainEqual(expect.any(AdoReporter));
  });
});
