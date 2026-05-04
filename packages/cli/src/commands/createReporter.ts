import { LogLevel } from "@lage-run/logger";
import {
  JsonReporter,
  AdoReporter,
  GithubActionsReporter,
  LogReporter,
  ProgressReporter,
  BasicReporter,
  VerboseFileLogReporter,
  ChromeTraceEventsReporter,
  type TargetReporter,
} from "@lage-run/reporters";
import type { BuiltInReporterName, ReporterInitOptions } from "../types/ReporterInitOptions.js";
import { findPackageRoot } from "workspace-tools";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import isInteractive from "is-interactive";

type MockImportReporter = (params: { reporterName: string; resolvedPath: string }) => unknown;

let mockImportReporter: MockImportReporter | undefined;

/**
 * Mock the reporter importing for tests. We don't currently support ESM in Jest, and it's too much
 * of a headache to set it up for one package, so instead we mock for most cases and handle a few
 * full realistic cases in the e2e tests.
 */
export function setMockImportReporter(mock: MockImportReporter | undefined): void {
  mockImportReporter = mock;
}

/**
 * Create a reporter of the given type.
 *
 * NOTE: This is covered by tests in `initializeReporter.test.ts`, `customReporter.test.ts`, and
 * E2E `customReporter.test.ts`.
 *
 * @param customReporterPath For a custom reporter, this is its absolute path (not verified to exist yet)
 */
export async function createReporter(reporter: string, options: ReporterInitOptions, customReporterPath?: string): Promise<TargetReporter> {
  const { verbose, grouped, logLevel: logLevelName, concurrency, profile, progress, logFile, indented, logMemory } = options;
  const logLevel = LogLevel[logLevelName];

  if (customReporterPath) {
    return loadCustomReporterModule(reporter, options, customReporterPath);
  }

  const lageRoot = findPackageRoot(__filename)!;
  const packageJson = JSON.parse(fs.readFileSync(path.join(lageRoot, "package.json"), "utf-8"));
  const version = packageJson.version;

  switch (reporter as BuiltInReporterName) {
    case "profile":
      return new ChromeTraceEventsReporter({
        concurrency,
        outputFile: typeof profile === "string" ? profile : undefined,
      });
    case "json":
      return new JsonReporter({ logLevel, indented: indented ?? false, logMemory });
    case "azureDevops":
    case "adoLog":
      return new AdoReporter({ grouped, logLevel: verbose ? LogLevel.verbose : logLevel, logMemory });

    case "githubActions":
    case "gha":
      return new GithubActionsReporter({ grouped, logLevel: verbose ? LogLevel.verbose : logLevel, logMemory });

    case "npmLog":
    case "old":
      return new LogReporter({ grouped, logLevel: verbose ? LogLevel.verbose : logLevel, logMemory });

    case "fancy":
      return new ProgressReporter({ concurrency, version, logMemory });

    case "verboseFileLog":
    case "vfl":
      return new VerboseFileLogReporter({ logFile, logMemory });
  }

  // Default reporter behavior - auto-detect CI environments
  if (process.env.GITHUB_ACTIONS) {
    return new GithubActionsReporter({ grouped: true, logLevel: verbose ? LogLevel.verbose : logLevel, logMemory });
  }

  if (process.env.TF_BUILD) {
    return new AdoReporter({ grouped: true, logLevel: verbose ? LogLevel.verbose : logLevel, logMemory });
  }

  if (progress && isInteractive() && !(logLevel >= LogLevel.verbose || verbose || grouped)) {
    return new BasicReporter({ concurrency, version, logMemory });
  }

  return new LogReporter({ grouped, logLevel: verbose ? LogLevel.verbose : logLevel, logMemory });
}

async function loadCustomReporterModule(reporter: string, options: ReporterInitOptions, resolvedPath: string): Promise<TargetReporter> {
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Custom reporter "${reporter}" file "${resolvedPath}" does not exist`);
  }

  let reporterInstance: TargetReporter | undefined;
  try {
    // Use dynamic import to load the custom reporter module
    // This works with both ESM (.mjs, .js with type: module) and CommonJS (.cjs, .js) files
    const reporterModule = mockImportReporter
      ? mockImportReporter({ reporterName: reporter, resolvedPath })
      : await import(pathToFileURL(resolvedPath).href);

    // Try different export patterns
    const maybeReporter = reporterModule[reporter] ?? reporterModule.default ?? reporterModule;

    if (typeof maybeReporter === "function") {
      reporterInstance = new maybeReporter(options);
    } else if (maybeReporter && typeof maybeReporter === "object") {
      reporterInstance = maybeReporter;
    }
  } catch (error) {
    throw new Error(`Failed to load custom reporter "${reporter}" from "${resolvedPath}": ${error}`);
  }

  if (reporterInstance && typeof reporterInstance.log === "function" && typeof reporterInstance.summarize === "function") {
    return reporterInstance;
  }

  const issue = reporterInstance
    ? "does not implement the Reporter interface (missing log or summarize method)"
    : "does not export a valid reporter class or instance";
  throw new Error(`Custom reporter "${reporter}" at "${resolvedPath}" ${issue}`);
}
