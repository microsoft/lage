import { Logger } from "@lage-run/logger";
import { initializeReporters } from "../src/commands/initializeReporters.js";

const testObject = {
  x: "field x",
  number: 1,
  array: [1, 2, 3],
  object: { a: 1, b: 2 },
};

describe("json reporter", () => {
  it("infoShouldLogCondensed", () => {
    jest.spyOn(Date, "now").mockImplementation(() => 0);
    const logSpy = jest.spyOn(console, "log");

    const logger = new Logger();
    initializeReporters(logger, {
      concurrency: 1,
      grouped: false,
      logLevel: "info",
      progress: true,
      reporter: ["json"],
      verbose: false,
    });

    logger.info("test Json", testObject);

    expect(logSpy).toHaveBeenCalledWith(
      '{"timestamp":0,"level":30,"msg":"test Json","data":{"x":"field x","number":1,"array":[1,2,3],"object":{"a":1,"b":2}}}'
    );
  });

  it("verboseShouldLogCondensed", () => {
    jest.setSystemTime(new Date("2020-01-01"));
    const logSpy = jest.spyOn(console, "log");

    const logger = new Logger();
    initializeReporters(logger, {
      concurrency: 1,
      grouped: false,
      logLevel: "verbose",
      progress: true,
      reporter: ["json"],
      verbose: false,
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
  });
});
