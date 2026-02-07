import { Monorepo } from "./mock/monorepo.js";
import { parseNdJson } from "./parseNdJson.js";

describe("custom reporters", () => {
  let repo: Monorepo | undefined;

  afterEach(async () => {
    await repo?.cleanup();
    repo = undefined;
  });

  it("should use custom reporter defined in lage config", async () => {
    repo = new Monorepo("custom-reporter");

    await repo.init();
    await repo.addPackage("a", ["b"]);
    await repo.addPackage("b");

    // Create a custom reporter file
    await repo.commitFiles({
      "custom-reporter.mjs": `
export class CustomTestReporter {
  constructor(options) {
    this.options = options;
    this.logs = [];
  }

  log(entry) {
    this.logs.push(entry);
  }

  summarize(summary) {
    console.log(JSON.stringify({
      customReporter: true,
      type: "summary",
      status: summary.results,
      duration: summary.duration
    }));
  }
}

export default CustomTestReporter;
      `,
    });

    // Update lage config to include custom reporter
    await repo.setLageConfig(`module.exports = {
  pipeline: {
    build: ['^build'],
    test: ['build'],
    lint: [],
  },
  npmClient: 'yarn',
  reporters: {
    customTest: './custom-reporter.mjs'
  }
};`);

    await repo.install();

    const results = await repo.run("build", ["--reporter", "customTest"]);
    const output = results.stdout + results.stderr;

    // Check that custom reporter was used
    expect(output).toContain('"customReporter":true');
    expect(output).toContain('"type":"summary"');
  });

  it("should use multiple reporters including custom ones", async () => {
    repo = new Monorepo("multiple-reporters");

    await repo.init();
    await repo.addPackage("a");

    // Create a custom reporter file
    await repo.commitFiles({
      "custom-reporter.mjs": `
export class CustomTestReporter {
  constructor(options) {
    this.options = options;
  }

  log(entry) {
    // no-op
  }

  summarize(summary) {
    console.log(JSON.stringify({
      customReporter: true,
      message: "Custom reporter summary"
    }));
  }
}

export default CustomTestReporter;
      `,
    });

    // Update lage config to include custom reporter
    await repo.setLageConfig(`module.exports = {
  pipeline: {
    build: ['^build'],
    test: ['build'],
  },
  npmClient: 'yarn',
  reporters: {
    customTest: './custom-reporter.mjs'
  }
};`);

    await repo.install();

    // Use both json and custom reporter
    const results = await repo.run("build", ["--reporter", "json", "--reporter", "customTest", "--log-level", "silly"]);
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    // Check that both reporters were used
    expect(jsonOutput.length).toBeGreaterThan(0); // json reporter output
    expect(output).toContain('"customReporter":true'); // custom reporter output
    expect(output).toContain('"message":"Custom reporter summary"');
  });

  it("should handle custom reporter with different export patterns", async () => {
    repo = new Monorepo("export-patterns");

    await repo.init();
    await repo.addPackage("a");

    // Create a custom reporter with named export that is also the default
    await repo.commitFiles({
      "named-export-reporter.mjs": `
export class NamedReporter {
  constructor(options) {
    this.options = options;
  }

  log(entry) {
    // no-op
  }

  summarize(summary) {
    console.log(JSON.stringify({
      namedExport: true,
      status: summary.results
    }));
  }
}

export default NamedReporter;
      `,
    });

    // Update lage config
    await repo.setLageConfig(`module.exports = {
  pipeline: {
    build: ['^build'],
  },
  npmClient: 'yarn',
  reporters: {
    namedReporter: './named-export-reporter.mjs'
  }
};`);

    await repo.install();

    const results = await repo.run("build", ["--reporter", "namedReporter"]);
    const output = results.stdout + results.stderr;

    expect(output).toContain('"namedExport":true');
  });

  it("should error when custom reporter file is invalid", async () => {
    repo = new Monorepo("reporter-not-found");

    await repo.init();
    await repo.addPackage("a");

    await repo.install();

    // Request a reporter that doesn't exist in config
    await expect(repo!.run("build", ["--reporter", "nonExistentReporter"])).rejects.toThrow(
      'Invalid --reporter option: "nonExistentReporter"'
    );
  });

  it("should handle custom reporter with relative path", async () => {
    repo = new Monorepo("relative-path");

    await repo.init();
    await repo.addPackage("a");

    // Create a custom reporter in a subdirectory
    await repo.commitFiles({
      "reporters/my-custom-reporter.mjs": `
export default class MyCustomReporter {
  constructor(options) {
    this.options = options;
  }

  log(entry) {
    // no-op
  }

  summarize(summary) {
    console.log(JSON.stringify({
      customPath: true,
      reporter: "my-custom-reporter"
    }));
  }
}
      `,
    });

    // Update lage config with relative path
    await repo.setLageConfig(`module.exports = {
  pipeline: {
    build: ['^build'],
  },
  npmClient: 'yarn',
  reporters: {
    myReporter: './reporters/my-custom-reporter.mjs'
  }
};`);

    await repo.install();

    const results = await repo.run("build", ["--reporter", "myReporter"]);
    const output = results.stdout + results.stderr;

    expect(output).toContain('"customPath":true');
    expect(output).toContain('"reporter":"my-custom-reporter"');
  });

  it("should pass options to custom reporter", async () => {
    repo = new Monorepo("reporter-options");

    await repo.init();
    await repo.addPackage("a");

    // Create a custom reporter that logs its options
    await repo.commitFiles({
      "options-reporter.mjs": `
export default class OptionsReporter {
  constructor(options) {
    this.options = options;
  }

  log(entry) {
    // no-op
  }

  summarize(summary) {
    console.log(JSON.stringify({
      receivedOptions: true,
      concurrency: this.options.concurrency,
      logLevel: this.options.logLevel,
      grouped: this.options.grouped
    }));
  }
}
      `,
    });

    await repo.setLageConfig(`module.exports = {
  pipeline: {
    build: ['^build'],
  },
  npmClient: 'yarn',
  reporters: {
    optionsTest: './options-reporter.mjs'
  }
};`);

    await repo.install();

    const results = await repo.run("build", ["--reporter", "optionsTest", "--concurrency", "2", "--grouped"]);
    const output = results.stdout + results.stderr;

    expect(output).toContain('"receivedOptions":true');
    expect(output).toContain('"concurrency":2');
    expect(output).toContain('"grouped":true');
  });

  it("should handle errors from custom reporter gracefully", async () => {
    repo = new Monorepo("reporter-error");

    await repo.init();
    await repo.addPackage("a");

    // Create a reporter with invalid JavaScript
    await repo.commitFiles({
      "broken-reporter.mjs": `
This is not valid JavaScript {{{ ]]] ;;;
      `,
    });

    await repo.setLageConfig(`module.exports = {
  pipeline: {
    build: ['^build'],
  },
  npmClient: 'yarn',
  reporters: {
    brokenReporter: './broken-reporter.mjs'
  }
};`);

    await repo.install();

    // Should throw an error when trying to use the broken reporter
    await expect(repo!.run("build", ["--reporter", "brokenReporter"])).rejects.toThrow();
  });

  it("should error when custom reporter exports a non-function/non-class value", async () => {
    repo = new Monorepo("invalid-export");

    await repo.init();
    await repo.addPackage("a");

    // Create a reporter that exports a number
    await repo.commitFiles({
      "number-reporter.mjs": `
export default 42;
      `,
    });

    await repo.setLageConfig(`module.exports = {
  pipeline: {
    build: ['^build'],
  },
  npmClient: 'yarn',
  reporters: {
    numberReporter: './number-reporter.mjs'
  }
};`);

    await repo.install();

    // Should throw an error when trying to use a reporter that exports a primitive value
    await expect(repo!.run("build", ["--reporter", "numberReporter"])).rejects.toThrow(
      /does not export a valid reporter class or instance/
    );
  });

  it("should error when custom reporter exports a string", async () => {
    repo = new Monorepo("string-export");

    await repo.init();
    await repo.addPackage("a");

    // Create a reporter that exports a string
    await repo.commitFiles({
      "string-reporter.mjs": `
export default "not a reporter";
      `,
    });

    await repo.setLageConfig(`module.exports = {
  pipeline: {
    build: ['^build'],
  },
  npmClient: 'yarn',
  reporters: {
    stringReporter: './string-reporter.mjs'
  }
};`);

    await repo.install();

    // Should throw an error when trying to use a reporter that exports a string
    await expect(repo!.run("build", ["--reporter", "stringReporter"])).rejects.toThrow(
      /does not export a valid reporter class or instance/
    );
  });

  it("should work with custom reporter that exports an object instance", async () => {
    repo = new Monorepo("object-instance");

    await repo.init();
    await repo.addPackage("a");

    // Create a reporter that exports an object instance (not a class)
    await repo.commitFiles({
      "object-reporter.mjs": `
const objectReporter = {
  log(entry) {
    // no-op
  },

  summarize(summary) {
    console.log(JSON.stringify({
      objectInstance: true,
      status: summary.results
    }));
  }
};

export default objectReporter;
      `,
    });

    await repo.setLageConfig(`module.exports = {
  pipeline: {
    build: ['^build'],
  },
  npmClient: 'yarn',
  reporters: {
    objectReporter: './object-reporter.mjs'
  }
};`);

    await repo.install();

    const results = await repo.run("build", ["--reporter", "objectReporter"]);
    const output = results.stdout + results.stderr;

    expect(output).toContain('"objectInstance":true');
  });

  it("should work with CommonJS custom reporter", async () => {
    repo = new Monorepo("commonjs-reporter");

    await repo.init();
    await repo.addPackage("a");

    // Create a CommonJS reporter
    await repo.commitFiles({
      "cjs-reporter.cjs": `
class CommonJSReporter {
  constructor(options) {
    this.options = options;
  }

  log(entry) {
    // no-op
  }

  summarize(summary) {
    console.log(JSON.stringify({
      commonJS: true,
      status: summary.results
    }));
  }
}

module.exports = CommonJSReporter;
      `,
    });

    await repo.setLageConfig(`module.exports = {
  pipeline: {
    build: ['^build'],
  },
  npmClient: 'yarn',
  reporters: {
    cjsReporter: './cjs-reporter.cjs'
  }
};`);

    await repo.install();

    const results = await repo.run("build", ["--reporter", "cjsReporter"]);
    const output = results.stdout + results.stderr;

    expect(output).toContain('"commonJS":true');
  });

  it("should allow custom reporter to track all build events", async () => {
    repo = new Monorepo("event-tracking");

    await repo.init();
    await repo.addPackage("a", ["b"]);
    await repo.addPackage("b");

    // Create a reporter that tracks events
    await repo.commitFiles({
      "tracking-reporter.mjs": `
export default class TrackingReporter {
  constructor(options) {
    this.options = options;
    this.events = [];
  }

  log(entry) {
    if (entry.data?.target && entry.data?.status) {
      this.events.push({
        target: entry.data.target,
        status: entry.data.status
      });
    }
  }

  summarize(summary) {
    console.log(JSON.stringify({
      trackingReporter: true,
      eventCount: this.events.length,
      summary: summary.results
    }));
  }
}
      `,
    });

    await repo.setLageConfig(`module.exports = {
  pipeline: {
    build: ['^build'],
    test: ['build'],
  },
  npmClient: 'yarn',
  reporters: {
    tracker: './tracking-reporter.mjs'
  }
};`);

    await repo.install();

    const results = await repo.run("test", ["--reporter", "tracker"]);
    const output = results.stdout + results.stderr;

    expect(output).toContain('"trackingReporter":true');
    expect(output).toContain('"eventCount"');
  });
});
