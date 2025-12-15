import fs from "fs";
import path from "path";
import os from "os";
import { Logger } from "@lage-run/logger";
import { initializeReporters } from "../src/commands/initializeReporters.js";

describe("initializeReporters with custom reporters", () => {
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
        reporter: ["nonExistentReporter123"],
        verbose: false,
      },
      customReporters
    );

    // Should fallback to progress reporter
    expect(reporters.length).toBe(1);
  });

  it("should throw error when custom reporter file is invalid", async () => {
    const logger = new Logger();
    const tmpDir = path.join(os.tmpdir(), "lage-custom-reporter");
    const invalidPath = path.join(tmpDir, "invalid-reporter.mjs");
    const invalidReporterName = "invalid-reporter";

    const customReporters = {
      [invalidReporterName]: invalidPath,
    };

    await expect(
      initializeReporters(
        logger,
        {
          concurrency: 1,
          grouped: false,
          logLevel: "info",
          progress: false,
          reporter: [invalidReporterName],
          verbose: false,
        },
        customReporters
      )
    ).rejects.toThrow(`Failed to load custom reporter "${invalidReporterName}" from "${invalidPath}"`);
  });
});
