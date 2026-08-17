import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Logger, type Reporter } from "@lage-run/logger";
import {
  AdoReporter,
  BasicReporter,
  ChromeTraceEventsReporter,
  GithubActionsReporter,
  JsonReporter,
  LogReporter,
  ProgressReporter,
} from "@lage-run/reporters";
import path from "path";
import { createTempDir, removeTempDir } from "@lage-run/test-utilities";
import type { BuiltInReporterName, ReporterInitOptions } from "../types/ReporterInitOptions.js";

jest.mock("is-interactive", () => jest.fn(() => true));

// jest.mock() is not hoisted above imports when jest is imported from @jest/globals.
// NOTE: Once lage uses ESM, this should be replaced with jest.unstable_mockModule() and await import(...).
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
const isInteractive = require("is-interactive") as jest.MockedFunction<typeof import("is-interactive")>;
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
const { initializeReporters } = require("../commands/initializeReporters.js") as typeof import("../commands/initializeReporters.js");

// The tests for custom reporters are in customReporter.test.ts
describe("initializeReporters", () => {
  const originalEnv = { ...process.env };
  let tmpDir: string | undefined;
  let reporters: ReadonlyArray<Reporter<never, never>> | undefined;

  async function callInitializeReporters(params?: {
    options?: Partial<ReporterInitOptions>;
    config?: { reporter?: string | string[] };
    defaultReporter?: BuiltInReporterName;
  }) {
    const logger = new Logger();
    await initializeReporters({
      logger,
      options: {
        concurrency: 1,
        grouped: false,
        logLevel: "info",
        progress: false,
        reporter: undefined,
        verbose: false,
        ...params?.options,
      },
      config: { reporters: {}, ...params?.config },
      root: "",
      defaultReporter: params?.defaultReporter,
    });
    return logger.reporters;
  }

  beforeEach(() => {
    // Clear CI env vars so default-reporter tests are environment-independent
    process.env = {};
    isInteractive.mockReturnValue(true);
  });

  afterEach(async () => {
    for (const reporter of reporters || []) {
      await reporter.cleanup?.();
    }
    reporters = undefined;
    process.env = { ...originalEnv };
    tmpDir && removeTempDir(tmpDir);
    tmpDir = undefined;
    jest.restoreAllMocks();
  });

  // progress: true is the default in local runs
  it("uses progress reporter with progress: true", async () => {
    reporters = await callInitializeReporters({
      options: { progress: true },
    });

    expect(reporters).toHaveLength(1);
    expect(reporters[0]).toBeInstanceOf(ProgressReporter);
  });

  it("uses basic reporter in slow terminal with progress: true", async () => {
    process.env.CODESPACES = "true";
    reporters = await callInitializeReporters({
      options: { progress: true },
    });

    expect(reporters).toHaveLength(1);
    expect(reporters[0]).toBeInstanceOf(BasicReporter);
  });

  it("uses old reporter when shell is not interactive", async () => {
    isInteractive.mockReturnValueOnce(false);
    reporters = await callInitializeReporters();

    expect(reporters).toEqual([expect.any(LogReporter)]);
  });

  it("uses old reporter when grouped", async () => {
    reporters = await callInitializeReporters({
      options: { grouped: true },
    });
    expect(reporters).toHaveLength(1);
    expect(reporters[0]).toBeInstanceOf(LogReporter);
  });

  it("uses old reporter when verbose", async () => {
    reporters = await callInitializeReporters({
      options: { verbose: true },
    });
    expect(reporters).toHaveLength(1);
    expect(reporters[0]).toBeInstanceOf(LogReporter);
  });

  it("uses profile reporter", async () => {
    tmpDir = createTempDir({ prefix: "lage-profile-" });
    reporters = await callInitializeReporters({
      options: { progress: true, profile: path.join(tmpDir, "profile.json") },
    });

    expect(reporters).toHaveLength(2);
    expect(reporters).toContainEqual(expect.any(ChromeTraceEventsReporter));
  });

  it("uses ADO reporter when reporter arg is adoLog", async () => {
    reporters = await callInitializeReporters({
      options: { reporter: ["adoLog"] },
    });
    expect(reporters).toHaveLength(1);
    expect(reporters[0]).toBeInstanceOf(AdoReporter);
  });

  it("auto-detects GitHub Actions and use GithubActionsReporter", async () => {
    process.env.GITHUB_ACTIONS = "true";
    reporters = await callInitializeReporters();
    expect(reporters).toHaveLength(1);
    expect(reporters[0]).toBeInstanceOf(GithubActionsReporter);
  });

  it("auto-detects Azure DevOps and use AdoReporter", async () => {
    process.env.TF_BUILD = "True";
    reporters = await callInitializeReporters();
    expect(reporters).toHaveLength(1);
    expect(reporters[0]).toBeInstanceOf(AdoReporter);
  });

  it("uses config.reporter string when no CLI --reporter is given", async () => {
    reporters = await callInitializeReporters({
      config: { reporter: "json" },
      // config.reporter overrides these
      options: { verbose: true, grouped: true },
    });
    expect(reporters).toHaveLength(1);
    expect(reporters[0]).toBeInstanceOf(JsonReporter);
  });

  it("uses config.reporter array when no CLI --reporter is given", async () => {
    reporters = await callInitializeReporters({
      config: { reporter: ["adoLog", "json"] },
      // config.reporter overrides these
      options: { verbose: true, grouped: true },
    });
    expect(reporters).toEqual([expect.any(AdoReporter), expect.any(JsonReporter)]);
  });

  it("overrides config.reporter when CLI --reporter is given", async () => {
    reporters = await callInitializeReporters({
      options: { reporter: ["adoLog"] },
      config: { reporter: "json" },
    });
    expect(reporters).toHaveLength(1);
    expect(reporters[0]).toBeInstanceOf(AdoReporter);
  });

  it("adds profile reporter alongside config.reporter when --profile is used", async () => {
    tmpDir = createTempDir({ prefix: "lage-profile-" });
    reporters = await callInitializeReporters({
      options: { profile: path.join(tmpDir, "profile.json") },
      config: { reporter: "adoLog" },
    });
    expect(reporters).toHaveLength(2);
    expect(reporters[0]).toBeInstanceOf(AdoReporter);
    expect(reporters[1]).toBeInstanceOf(ChromeTraceEventsReporter);
  });

  it("uses config.reporter instead of defaultReporter", async () => {
    reporters = await callInitializeReporters({
      config: { reporter: "adoLog" },
      defaultReporter: "json",
    });
    expect(reporters).toHaveLength(1);
    expect(reporters[0]).toBeInstanceOf(AdoReporter);
  });

  it("falls back to defaultReporter when no other reporter option is set", async () => {
    reporters = await callInitializeReporters({
      defaultReporter: "json",
    });
    expect(reporters).toHaveLength(1);
    expect(reporters[0]).toBeInstanceOf(JsonReporter);
  });
});
