import { Logger, type Reporter } from "@lage-run/logger";
import { AdoReporter, BasicReporter, ChromeTraceEventsReporter, GithubActionsReporter, LogReporter } from "@lage-run/reporters";
import fs from "fs";
import isInteractive from "is-interactive";
import os from "os";
import path from "path";
import { initializeReporters } from "../commands/initializeReporters.js";

jest.mock("is-interactive", () => jest.fn(() => true));

describe("initializeReporters", () => {
  let tmpDir: string;
  let reporters: Reporter[] | undefined;
  let savedGithubActions: string | undefined;
  let savedTfBuild: string | undefined;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lage-"));
  });

  beforeEach(() => {
    // Save and clear CI env vars so default-reporter tests are environment-independent
    savedGithubActions = process.env.GITHUB_ACTIONS;
    savedTfBuild = process.env.TF_BUILD;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.TF_BUILD;
  });

  afterEach(async () => {
    for (const reporter of reporters || []) {
      reporter.cleanup?.();
    }
    reporters = undefined;
    // Restore CI env vars
    if (savedGithubActions !== undefined) {
      process.env.GITHUB_ACTIONS = savedGithubActions;
    }
    if (savedTfBuild !== undefined) {
      process.env.TF_BUILD = savedTfBuild;
    }
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should initialize progress reporter when param is progress passed as true", async () => {
    const logger = new Logger();
    reporters = await initializeReporters(logger, {
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
    reporters = await initializeReporters(logger, {
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
    reporters = await initializeReporters(logger, {
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
    reporters = await initializeReporters(logger, {
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
    reporters = await initializeReporters(logger, {
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

  it("should auto-detect GitHub Actions and use GithubActionsReporter", async () => {
    process.env.GITHUB_ACTIONS = "true";
    const logger = new Logger();
    reporters = await initializeReporters(logger, {
      concurrency: 1,
      grouped: false,
      logLevel: "info",
      progress: false,
      reporter: [],
      verbose: false,
    });
    expect(reporters.length).toBe(1);
    expect(reporters).toContainEqual(expect.any(GithubActionsReporter));
  });

  it("should auto-detect Azure DevOps and use AdoReporter", async () => {
    process.env.TF_BUILD = "True";
    const logger = new Logger();
    reporters = await initializeReporters(logger, {
      concurrency: 1,
      grouped: false,
      logLevel: "info",
      progress: false,
      reporter: [],
      verbose: false,
    });
    expect(reporters.length).toBe(1);
    expect(reporters).toContainEqual(expect.any(AdoReporter));
  });
});
