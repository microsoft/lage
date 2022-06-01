import createLogger, { LogEntry, LogLevel, Reporter } from "../src/index";

describe("logger", () => {
  class TestReporter implements Reporter {
    logLevel = LogLevel.warn;
    entries: LogEntry[] = [];

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
});
