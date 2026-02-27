import { Logger } from "@lage-run/logger";
import path from "path";
import { initializeReporters } from "../commands/initializeReporters.js";

describe("initializeReporters with custom reporters", () => {
  it("should throw an error when custom reporter not found", async () => {
    const logger = new Logger();
    const customReporters = {};

    await expect(() =>
      initializeReporters(
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
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid --reporter option: "nonExistentReporter123". Supported reporters are: json, azureDevops, npmLog, verboseFileLog, vfl, adoLog, githubActions, gha, fancy, default"`
    );
  });

  it("should throw error when custom reporter file is invalid", async () => {
    const logger = new Logger();
    const invalidPath = path.resolve("invalid-reporter.mjs");
    const invalidReporterName = "invalid-reporter";

    const customReporters = {
      [invalidReporterName]: invalidPath,
    };

    await expect(() =>
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
