import { Logger } from "@lage-run/logger";
import { initializeReporters } from "../src/commands/initializeReporters.js";

const testObject = {
  x: "field x",
  number: 1,
  array: [1, 2, 3],
  object: { a: 1, b: 2 },
};

describe("json reporter", () => {
  it("indentedFalseShouldLogCondensed", async () => {
    jest.spyOn(Date, "now").mockImplementation(() => 0);
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
      '{"timestamp":0,"level":30,"msg":"test Json","data":{"x":"field x","number":1,"array":[1,2,3],"object":{"a":1,"b":2}}}'
    );
    jest.clearAllMocks();
  });

  it("indentedTrueShouldLogCondensed", async () => {
    jest.setSystemTime(new Date("2020-01-01"));
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
      `{
  \"timestamp\": 0,
  \"level\": 30,
  \"msg\": \"test Json\",
  \"data\": {
    \"x\": \"field x\",
    \"number\": 1,
    \"array\": [
      1,
      2,
      3
    ],
    \"object\": {
      \"a\": 1,
      \"b\": 2
    }
  }
}`
    );
    jest.clearAllMocks();
  });
});
