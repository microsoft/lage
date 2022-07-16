import { PassThrough } from "stream";
import createLogger, { LogEntry, LogLevel, LogStructuredData, Reporter } from "../src/index";

describe("logger", () => {
  class TestReporter<T extends LogStructuredData = LogStructuredData> implements Reporter {
    logLevel = LogLevel.warn;
    entries: LogEntry<T>[] = [];

    log(entry) {
      this.entries.push(entry);
    }

    summarize<TContext>(_context: TContext): void {}
  }

  it("should create a logger that reports to a single reporter", () => {
    const logger = createLogger();
    const reporter = new TestReporter();
    logger.addReporter(reporter);
    logger.info("info");

    expect(reporter.entries[0].level).toBe(LogLevel.info);
    expect(reporter.entries[0].data).toBeUndefined();
    expect(reporter.entries[0].msg).toBe("info");
  });

  it("should create a logger that reports to a multiple reporter", () => {
    const logger = createLogger();

    const reporter1 = new TestReporter();
    const reporter2 = new TestReporter();

    logger.addReporter(reporter1);
    logger.addReporter(reporter2);
    logger.info("info");

    expect(reporter1.entries[0].level).toBe(LogLevel.info);
    expect(reporter1.entries[0].data).toBeUndefined();
    expect(reporter1.entries[0].msg).toBe("info");

    expect(reporter2.entries[0].level).toBe(LogLevel.info);
    expect(reporter2.entries[0].data).toBeUndefined();
    expect(reporter2.entries[0].msg).toBe("info");
  });

  it("should be able to report on structured data", () => {
    const logger = createLogger();

    const reporter = new TestReporter();

    logger.addReporter(reporter);
    logger.info("info", { foo: "bar" });

    expect(reporter.entries[0].level).toBe(LogLevel.info);
    expect(reporter.entries[0].data).not.toBeUndefined();
    expect(reporter.entries[0].data.foo).toBe("bar");
    expect(reporter.entries[0].msg).toBe("info");
  });

  it("should allow creation of a logger with specific structured data shape", () => {
    type MyStructuredData = { somedata: { foo: string } };
    const specificLogger = createLogger<MyStructuredData>();
    const reporter = new TestReporter<MyStructuredData>();

    specificLogger.addReporter(reporter);
    specificLogger.info("info", { somedata: { foo: "bar" } });

    expect(reporter.entries[0].level).toBe(LogLevel.info);
    expect(reporter.entries[0].data).not.toBeUndefined();
    expect(reporter.entries[0].data.somedata.foo).toBe("bar");
    expect(reporter.entries[0].msg).toBe("info");
  });

  it("should be able to log from a stream", () => {
    const logger = createLogger();

    const reporter = new TestReporter();

    const stream = new PassThrough();
    logger.stream(LogLevel.info, stream, { foo: "bar" });
    logger.addReporter(reporter);

    // chunk w/o a new line
    stream.write("foo ");
    // chunk with multiple newlines
    stream.write("bar\nfiz\n");
    stream.end();

    expect(reporter.entries[0].level).toBe(LogLevel.info);
    expect(reporter.entries[0].data).not.toBeUndefined();
    expect(reporter.entries[0].data!.foo).toBe("bar");
    expect(reporter.entries[0].msg).toBe("foo bar");

    expect(reporter.entries[1].msg).toBe("fiz");
  });
});
