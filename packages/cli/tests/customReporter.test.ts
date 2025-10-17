import fs from "fs";
import path from "path";
import os from "os";
import { Logger } from "@lage-run/logger";
import { initializeReporters } from "../src/commands/initializeReporters.js";

describe("initializeReporters with custom reporters", () => {
  let tmpDir: string;
  let customReporterPath: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lage-custom-reporter"));
    customReporterPath = path.join(tmpDir, "custom-reporter.mjs");

    // Create a simple custom reporter as ES module
    const reporterCode = `
      export class CustomTestReporter {
        constructor(options) {
          this.options = options;
          this.logs = [];
        }

        log(entry) {
          this.logs.push(entry);
        }

        summarize(summary) {
          console.log(JSON.stringify({ custom: true, summary: "test" }));
        }
      }

      export default CustomTestReporter;
    `;

    fs.writeFileSync(customReporterPath, reporterCode);
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Skip these tests in Jest environment as it doesn't support dynamic imports
  // The functionality is tested in e2e tests
  it.skip("should load and initialize custom reporter from file path", async () => {
    const logger = new Logger();
    const customReporters = {
      customTest: customReporterPath,
    };

    const reporters = await initializeReporters(
      logger,
      {
        concurrency: 1,
        grouped: false,
        logLevel: "info",
        progress: false,
        reporter: ["customTest"],
        verbose: false,
      },
      customReporters
    );

    expect(reporters.length).toBe(1);
    expect(reporters[0]).toBeDefined();
    expect(typeof reporters[0].log).toBe("function");
    expect(typeof reporters[0].summarize).toBe("function");
  });

  it.skip("should load multiple reporters including custom ones", async () => {
    const logger = new Logger();
    const customReporters = {
      customTest: customReporterPath,
    };

    const reporters = await initializeReporters(
      logger,
      {
        concurrency: 1,
        grouped: false,
        logLevel: "info",
        progress: false,
        reporter: ["json", "customTest"],
        verbose: false,
      },
      customReporters
    );

    expect(reporters.length).toBe(2);
  });

  it("should fallback to default reporter when custom reporter not found", async () => {
    const logger = new Logger();
    const customReporters = {};

    const reporters = await initializeReporters(
      logger,
      {
        concurrency: 1,
        grouped: false,
        logLevel: "info",
        progress: true,
        reporter: ["nonExistentReporter"],
        verbose: false,
      },
      customReporters
    );

    // Should fallback to progress reporter
    expect(reporters.length).toBe(1);
  });

  it("should throw error when custom reporter file is invalid", async () => {
    const logger = new Logger();
    const invalidPath = path.join(tmpDir, "invalid-reporter.mjs");
    fs.writeFileSync(invalidPath, "This is not valid JavaScript {{{");

    const customReporters = {
      invalid: invalidPath,
    };

    await expect(
      await initializeReporters(
        logger,
        {
          concurrency: 1,
          grouped: false,
          logLevel: "info",
          progress: false,
          reporter: ["invalid"],
          verbose: false,
        },
        customReporters
      )
    ).rejects.toThrow();
  });
});
