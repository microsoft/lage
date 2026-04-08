import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Logger, type Reporter } from "@lage-run/logger";
import {
  AdoReporter,
  BasicReporter,
  ChromeTraceEventsReporter,
  GithubActionsReporter,
  JsonReporter,
  LogReporter,
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
  let reporters: Reporter[] | undefined;

  function callInitializeReporters(params?: {
    options?: Partial<ReporterInitOptions>;
    config?: { reporter?: string | string[] };
    defaultReporter?: BuiltInReporterName;
  }) {
    return initializeReporters({
      logger: new Logger(),
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
  }

  beforeEach(() => {
    // Clear CI env vars so default-reporter tests are environment-independent
    delete process.env.GITHUB_ACTIONS;
    delete process.env.TF_BUILD;
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

  it("should initialize progress reporter when param is progress passed as true", async () => {
    reporters = await callInitializeReporters({
      options: { progress: true },
    });

    expect(reporters).toEqual([expect.any(BasicReporter)]);
  });

  it("should initialize old reporter when shell is not interactive", async () => {
    isInteractive.mockReturnValueOnce(false);
    reporters = await callInitializeReporters();

    expect(reporters).toEqual([expect.any(LogReporter)]);
  });

  it("should initialize old reporter when grouped", async () => {
    reporters = await callInitializeReporters({
      options: { grouped: true },
    });
    expect(reporters).toEqual([expect.any(LogReporter)]);
  });

  it("should initialize old reporter when verbose", async () => {
    reporters = await callInitializeReporters({
      options: { verbose: true },
    });
    expect(reporters).toEqual([expect.any(LogReporter)]);
  });

  it("should initialize profile reporter", async () => {
    tmpDir = createTempDir({ prefix: "lage-profile-" });
    reporters = await callInitializeReporters({
      options: { progress: true, profile: path.join(tmpDir, "profile.json") },
    });

    expect(reporters.length).toBe(2);
    expect(reporters).toContainEqual(expect.any(ChromeTraceEventsReporter));
  });

  it("should initialize ADO reporter when reporter arg is adoLog", async () => {
    reporters = await callInitializeReporters({
      options: { reporter: ["adoLog"] },
    });
    expect(reporters).toEqual([expect.any(AdoReporter)]);
  });

  it("should auto-detect GitHub Actions and use GithubActionsReporter", async () => {
    process.env.GITHUB_ACTIONS = "true";
    reporters = await callInitializeReporters();
    expect(reporters).toEqual([expect.any(GithubActionsReporter)]);
  });

  it("should auto-detect Azure DevOps and use AdoReporter", async () => {
    process.env.TF_BUILD = "True";
    reporters = await callInitializeReporters();
    expect(reporters).toEqual([expect.any(AdoReporter)]);
  });

  it("should use config.reporter string when no CLI --reporter is given", async () => {
    reporters = await callInitializeReporters({
      config: { reporter: "json" },
    });
    expect(reporters).toEqual([expect.any(JsonReporter)]);
  });

  it("should use config.reporter array when no CLI --reporter is given", async () => {
    reporters = await callInitializeReporters({
      config: { reporter: ["adoLog", "json"] },
    });
    expect(reporters).toEqual([expect.any(AdoReporter), expect.any(JsonReporter)]);
  });

  it("should override config.reporter when CLI --reporter is given", async () => {
    reporters = await callInitializeReporters({
      options: { reporter: ["adoLog"] },
      config: { reporter: "json" },
    });
    expect(reporters).toEqual([expect.any(AdoReporter)]);
  });

  it("should add profile reporter alongside config.reporter when --profile is used", async () => {
    tmpDir = createTempDir({ prefix: "lage-profile-" });
    reporters = await callInitializeReporters({
      options: { profile: path.join(tmpDir, "profile.json") },
      config: { reporter: "adoLog" },
    });
    expect(reporters).toEqual([expect.any(AdoReporter), expect.any(ChromeTraceEventsReporter)]);
  });

  it("should use config.reporter instead of defaultReporter", async () => {
    reporters = await callInitializeReporters({
      config: { reporter: "adoLog" },
      defaultReporter: "json",
    });
    expect(reporters).toEqual([expect.any(AdoReporter)]);
  });

  it("should fall back to defaultReporter when no other reporter option is set", async () => {
    reporters = await callInitializeReporters({
      defaultReporter: "json",
    });
    expect(reporters).toEqual([expect.any(JsonReporter)]);
  });
});
