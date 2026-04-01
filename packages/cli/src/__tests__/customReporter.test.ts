import { afterEach, describe, expect, it } from "@jest/globals";
import { Logger } from "@lage-run/logger";
import type { Reporter } from "@lage-run/logger";
import fs from "fs";
import path from "path";
import { createTempDir, removeTempDir } from "@lage-run/test-utilities";
import { initializeReporters } from "../commands/initializeReporters.js";
import { setMockImportReporter } from "../commands/createReporter.js";
import type { ReporterInitOptions } from "../types/ReporterInitOptions.js";

/**
 * These tests cover some scenarios for custom reporters, but they can't cover actual importing
 * since we don't have ESM support configured in Jest. So this covers various mocked cases,
 * and the e2e customReporter.test.ts covers actual importing with a few different patterns.
 */
describe("initializeReporters with custom reporters", () => {
  let tmpDir = "";

  const options: ReporterInitOptions = {
    concurrency: 1,
    grouped: false,
    logLevel: "info",
    progress: false,
    verbose: false,
    reporter: undefined,
  };

  afterEach(() => {
    setMockImportReporter(undefined);
    tmpDir && removeTempDir(tmpDir);
    tmpDir = "";
  });

  /** Reporter mock-imported by a few tests */
  class TestReporter implements Reporter {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    constructor(public options: ReporterInitOptions) {}
    public log() {}
    public summarize() {}
  }

  function writeFixture(filename: string, content: string): string {
    tmpDir = createTempDir({ prefix: "lage-custom-reporter-test-" });
    const filePath = path.join(tmpDir, filename);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  it("should throw an error when custom reporter not found", async () => {
    await expect(() =>
      initializeReporters(
        new Logger(),
        {
          ...options,
          reporter: ["nonExistentReporter123"],
        },
        { customReporters: {}, root: process.cwd() }
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid --reporter option: "nonExistentReporter123". Supported reporters are: json, azureDevops, npmLog, verboseFileLog, vfl, adoLog, githubActions, gha, fancy, default"`
    );
  });

  it("should throw error when custom reporter file does not exist", async () => {
    const invalidPath = path.resolve("invalid-reporter.mjs");

    await expect(() =>
      initializeReporters(
        new Logger(),
        { ...options, reporter: ["myReporter"] },
        {
          customReporters: { myReporter: invalidPath },
          root: process.cwd(),
        }
      )
    ).rejects.toThrow(`Custom reporter "myReporter" file "${invalidPath}" does not exist`);
  });

  it("should load custom reporter with default class export (mocked)", async () => {
    // this isn't actually read but needs to exist for an earlier check
    const reporterPath = writeFixture("default-class.mjs", "");

    setMockImportReporter(({ reporterName, resolvedPath }) => {
      expect(reporterName).toBe("myReporter");
      expect(resolvedPath).toBe(reporterPath);
      return { default: TestReporter };
    });

    const allOptions: ReporterInitOptions = { ...options, reporter: ["myReporter"] };

    const reporters = await initializeReporters(new Logger(), allOptions, {
      customReporters: { myReporter: reporterPath },
      root: tmpDir,
    });

    expect(reporters).toHaveLength(1);
    expect(reporters[0]).toBeInstanceOf(TestReporter);
    // Options are passed through
    expect((reporters[0] as TestReporter).options).toBe(allOptions);
  });

  it("should load multiple reporters including custom ones (mocked)", async () => {
    // this isn't actually read but needs to exist for an earlier check
    const reporterPath = writeFixture("default-class.mjs", "");
    setMockImportReporter(({ reporterName, resolvedPath }) => {
      expect(reporterName).toBe("myReporter");
      expect(resolvedPath).toBe(reporterPath);
      return { default: TestReporter };
    });

    const reporters = await initializeReporters(
      new Logger(),
      { ...options, reporter: ["json", "myReporter"] },
      {
        customReporters: { myReporter: reporterPath },
        root: tmpDir,
      }
    );

    expect(reporters).toHaveLength(2);
    expect(reporters[1]).toBeInstanceOf(TestReporter);
  });

  it("should load custom reporter with named class export matching reporter key (mocked)", async () => {
    const reporterPath = writeFixture("named-export.mjs", "");
    setMockImportReporter(({ reporterName, resolvedPath }) => {
      expect(reporterName).toBe("myNamedReporter");
      expect(resolvedPath).toBe(reporterPath);
      return { myNamedReporter: TestReporter };
    });

    const reporters = await initializeReporters(
      new Logger(),
      { ...options, reporter: ["myNamedReporter"] },
      { customReporters: { myNamedReporter: reporterPath }, root: tmpDir }
    );

    expect(reporters).toHaveLength(1);
    expect(reporters[0]).toHaveProperty("log");
    expect(reporters[0]).toHaveProperty("summarize");
  });

  it("prefers named export matching reporter name over default export (mocked)", async () => {
    const reporterPath = writeFixture("named-and-default.mjs", "");
    setMockImportReporter(({ reporterName, resolvedPath }) => {
      expect(reporterName).toBe("myReporter");
      expect(resolvedPath).toBe(reporterPath);
      return { default: class DefaultReporter {}, myReporter: TestReporter };
    });

    const reporters = await initializeReporters(
      new Logger(),
      { ...options, reporter: ["myReporter"] },
      { customReporters: { myReporter: reporterPath }, root: tmpDir }
    );

    expect(reporters).toHaveLength(1);
    expect(reporters[0]).toBeInstanceOf(TestReporter);
  });

  it("should error when custom reporter exports a non-function/non-class value (mocked)", async () => {
    const reporterPath = writeFixture("string-export.mjs", "");
    setMockImportReporter(() => {
      return { default: "not a reporter" };
    });

    await expect(() =>
      initializeReporters(
        new Logger(),
        { ...options, reporter: ["stringReporter"] },
        { customReporters: { stringReporter: reporterPath }, root: tmpDir }
      )
    ).rejects.toThrow(/does not export a valid reporter class or instance/);
  });

  it("should work with custom reporter that exports an object instance (mocked)", async () => {
    const reporterPath = writeFixture("object-instance.mjs", "");
    const mockReporter: Reporter = { log() {}, summarize() {} };
    setMockImportReporter(() => {
      return { default: mockReporter };
    });

    const reporters = await initializeReporters(
      new Logger(),
      { ...options, reporter: ["objReporter"] },
      { customReporters: { objReporter: reporterPath }, root: tmpDir }
    );

    expect(reporters).toHaveLength(1);
    expect(reporters[0]).toBe(mockReporter);
  });

  it("should handle errors from broken custom reporter file (mocked)", async () => {
    const reporterPath = writeFixture("broken-reporter.mjs", `This is not valid JavaScript {{{ ]]] ;;;`);
    setMockImportReporter(() => {
      throw new Error("oh no");
    });

    await expect(() =>
      initializeReporters(
        new Logger(),
        { ...options, reporter: ["brokenReporter"] },
        { customReporters: { brokenReporter: reporterPath }, root: tmpDir }
      )
    ).rejects.toThrow('Failed to load custom reporter "brokenReporter"');
  });

  it("errors if the reporter class instance does not have required methods (mocked)", async () => {
    const reporterPath = writeFixture("invalid-reporter.mjs", "");
    setMockImportReporter(() => {
      return { default: class InvalidReporter {} };
    });

    await expect(() =>
      initializeReporters(
        new Logger(),
        { ...options, reporter: ["invalidReporter"] },
        { customReporters: { invalidReporter: reporterPath }, root: tmpDir }
      )
    ).rejects.toThrow(`Custom reporter "invalidReporter" at "${reporterPath}" does not implement the Reporter interface`);
  });

  it("errors if reporter object does not have required methods (mocked)", async () => {
    const reporterPath = writeFixture("invalid-reporter-object.mjs", "");
    setMockImportReporter(() => {
      return { default: { nope: true } };
    });

    await expect(() =>
      initializeReporters(
        new Logger(),
        { ...options, reporter: ["invalidReporterObject"] },
        { customReporters: { invalidReporterObject: reporterPath }, root: tmpDir }
      )
    ).rejects.toThrow(`Custom reporter "invalidReporterObject" at "${reporterPath}" does not implement the Reporter interface`);
  });

  it("errors on empty default export (mocked)", async () => {
    // This would probably happen for CJS with unset module.exports
    const reporterPath = writeFixture("empty-object.cjs", "");
    setMockImportReporter(() => {
      return { default: {} };
    });

    await expect(() =>
      initializeReporters(
        new Logger(),
        { ...options, reporter: ["emptyObjectReporter"] },
        { customReporters: { emptyObjectReporter: reporterPath }, root: tmpDir }
      )
    ).rejects.toThrow(`Custom reporter "emptyObjectReporter" at "${reporterPath}" does not implement the Reporter interface`);
  });
});
