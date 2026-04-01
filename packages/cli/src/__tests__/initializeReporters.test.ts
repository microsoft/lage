import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Logger, type Reporter } from "@lage-run/logger";
import { AdoReporter, BasicReporter, ChromeTraceEventsReporter, GithubActionsReporter, LogReporter } from "@lage-run/reporters";
import path from "path";
import { createTempDir, removeTempDir } from "@lage-run/test-utilities";
import type { ReporterInitOptions } from "../types/ReporterInitOptions.js";

jest.mock("is-interactive", () => jest.fn(() => true));

// jest.mock() is not hoisted above imports when jest is imported from @jest/globals.
// NOTE: Once lage uses ESM, this should be replaced with jest.unstable_mockModule() and await import(...).
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
const isInteractive = require("is-interactive") as jest.MockedFunction<typeof import("is-interactive")>;
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
const { initializeReporters } = require("../commands/initializeReporters.js") as typeof import("../commands/initializeReporters.js");

// The tests for custom reporters are in customReporter.test.ts
describe("initializeReporters", () => {
  let tmpDir: string | undefined;
  let reporters: Reporter[] | undefined;
  let savedGithubActions: string | undefined;
  let savedTfBuild: string | undefined;

  const options: ReporterInitOptions = {
    concurrency: 1,
    grouped: false,
    logLevel: "info",
    progress: false,
    reporter: [],
    verbose: false,
  };

  beforeEach(() => {
    // Save and clear CI env vars so default-reporter tests are environment-independent
    savedGithubActions = process.env.GITHUB_ACTIONS;
    savedTfBuild = process.env.TF_BUILD;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.TF_BUILD;
  });

  afterEach(() => {
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
    tmpDir && removeTempDir(tmpDir);
    tmpDir = undefined;
    jest.restoreAllMocks();
  });

  it("should initialize progress reporter when param is progress passed as true", async () => {
    const logger = new Logger();
    reporters = await initializeReporters(
      logger,
      {
        ...options,
        progress: true,
      },
      undefined
    );

    expect(reporters).toEqual([expect.any(BasicReporter)]);
  });

  it("should initialize old reporter when shell is not interactive", async () => {
    isInteractive.mockReturnValueOnce(false);
    const logger = new Logger();
    reporters = await initializeReporters(logger, { ...options }, undefined);

    expect(reporters).toEqual([expect.any(LogReporter)]);
  });

  it("should initialize old reporter when grouped", async () => {
    const logger = new Logger();
    reporters = await initializeReporters(
      logger,
      {
        ...options,
        grouped: true,
      },
      undefined
    );
    expect(reporters).toEqual([expect.any(LogReporter)]);
  });

  it("should initialize old reporter when verbose", async () => {
    const logger = new Logger();
    reporters = await initializeReporters(
      logger,
      {
        ...options,
        verbose: true,
      },
      undefined
    );
    expect(reporters).toEqual([expect.any(LogReporter)]);
  });

  it("should initialize profile reporter", async () => {
    const logger = new Logger();
    tmpDir = createTempDir({ prefix: "lage-profile-" });
    reporters = await initializeReporters(
      logger,
      {
        ...options,
        progress: true,
        profile: path.join(tmpDir, "profile.json"),
      },
      undefined
    );

    expect(reporters.length).toBe(2);
    expect(reporters).toContainEqual(expect.any(ChromeTraceEventsReporter));
  });

  it("should initialize ADO reporter when reporter arg is adoLog", async () => {
    const logger = new Logger();
    reporters = await initializeReporters(
      logger,
      {
        ...options,
        reporter: ["adoLog"],
      },
      undefined
    );
    expect(reporters).toEqual([expect.any(AdoReporter)]);
  });

  it("should auto-detect GitHub Actions and use GithubActionsReporter", async () => {
    process.env.GITHUB_ACTIONS = "true";
    const logger = new Logger();
    reporters = await initializeReporters(logger, { ...options }, undefined);
    expect(reporters).toEqual([expect.any(GithubActionsReporter)]);
  });

  it("should auto-detect Azure DevOps and use AdoReporter", async () => {
    process.env.TF_BUILD = "True";
    const logger = new Logger();
    reporters = await initializeReporters(logger, { ...options }, undefined);
    expect(reporters).toEqual([expect.any(AdoReporter)]);
  });
});
