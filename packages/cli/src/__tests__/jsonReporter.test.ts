import { Logger } from "@lage-run/logger";
import { initializeReporters } from "../commands/initializeReporters.js";

const testObject = {
  x: "field x",
  number: 1,
  array: [1, 2, 3],
  object: { a: 1, b: 2 },
};

describe("json reporter", () => {
  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(Date, "now").mockImplementation(() => 0);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("uses condensed output with indented: false", async () => {
    const logSpy = jest.spyOn(console, "log");

    const logger = new Logger();
    await initializeReporters(logger, {
      concurrency: 1,
      grouped: false,
      logLevel: "info",
      progress: true,
      reporter: ["json"],
      verbose: false,
      indented: false,
    });

    logger.info("test Json", testObject);

    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({
        timestamp: 0,
        level: 30,
        msg: "test Json",
        data: testObject,
      })
    );
    jest.clearAllMocks();
  });

  it("formats output with indented: true", async () => {
    const logSpy = jest.spyOn(console, "log");

    const logger = new Logger();
    await initializeReporters(logger, {
      concurrency: 1,
      grouped: false,
      logLevel: "verbose",
      progress: true,
      reporter: ["json"],
      verbose: false,
      indented: true,
    });

    logger.info("test Json", testObject);

    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify(
        {
          timestamp: 0,
          level: 30,
          msg: "test Json",
          data: testObject,
        },
        null,
        2
      )
    );
    jest.clearAllMocks();
  });
});
