import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from "@jest/globals";
import { Logger } from "@lage-run/logger";
import { initializeReporters } from "../commands/initializeReporters.js";

describe("json reporter", () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;

  const testObject = {
    x: "field x",
    number: 1,
    array: [1, 2, 3],
    object: { a: 1, b: 2 },
  };

  beforeAll(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(Date, "now").mockImplementation(() => 0);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("uses condensed output with indented: false", async () => {
    const logger = new Logger();
    await initializeReporters({
      logger,
      options: {
        concurrency: 1,
        grouped: false,
        logLevel: "info",
        progress: true,
        reporter: ["json"],
        verbose: false,
        indented: false,
      },
      config: { reporters: {} },
      root: "",
    });

    logger.info("test Json", testObject);

    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ timestamp: 0, level: 30, msg: "test Json", data: testObject }));
  });

  it("formats output with indented: true", async () => {
    const logger = new Logger();
    await initializeReporters({
      logger,
      options: {
        concurrency: 1,
        grouped: false,
        logLevel: "verbose",
        progress: true,
        reporter: ["json"],
        verbose: false,
        indented: true,
      },
      config: { reporters: {} },
      root: "",
    });

    logger.info("test Json", testObject);

    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ timestamp: 0, level: 30, msg: "test Json", data: testObject }, null, 2));
  });
});
