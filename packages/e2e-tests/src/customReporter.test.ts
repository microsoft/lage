import { afterEach, describe, expect, it } from "@jest/globals";
import { Monorepo, type MonorepoInitParams } from "./mock/monorepo.js";
import path from "path";
import { getStatusEntriesData, parseNdJson } from "./parseNdJson.js";

/**
 * Basic cases for custom reporters should be covered in cli/src/__tests__/customReporter.test.ts,
 * but in that context we can't test actual importing of files due to Jest ESM limitations.
 *
 * The tests in this file are VERY SLOW, so they should cover E2E scenarios only and consider
 * combining cases where it makes sense.
 */
describe("custom reporters", () => {
  let repo: Monorepo | undefined;

  /** Get a custom reporter class that logs `hello from <name>` on summarize */
  function getCustomReporterClass(name: string) {
    return `class ${name} {
  constructor(options) {
    this.options = options;
    this.logs = [];
  }

  log(entry) {
    this.logs.push(entry);
  }

  summarize(summary) {
    console.log("hello from ${name}");
  }
}`;
  }

  /**
   * Init the repo with a lage config with the reporters, and simpler top-level
   * `build` and `test` scripts that don't add an extra reporter like the defaults.
   */
  async function initRepoWithReporters(
    params: Pick<MonorepoInitParams, "packages" | "extraFiles"> & { reporters: Record<string, string> }
  ) {
    await repo!.init({
      lageConfig: {
        pipeline: {
          build: ["^build"],
          test: ["build"],
        },
        npmClient: "yarn",
        reporters: params.reporters,
      },
      scripts: {
        build: "lage build",
        test: "lage test",
      },
      packages: params.packages,
      extraFiles: params.extraFiles,
    });
  }

  afterEach(async () => {
    await repo?.cleanup();
    repo = undefined;
  });

  it("should use custom reporters defined in lage config (default exports, ESM+CJS)", async () => {
    repo = new Monorepo("custom-reporter");

    await initRepoWithReporters({
      reporters: {
        customTest: "./custom-reporter.mjs",
        unused: "./unused-reporter.js",
        cjs: "./extra/cjs-reporter.cjs",
      },
      packages: { a: {} },
      extraFiles: {
        // ESM reporter is exported as default
        "custom-reporter.mjs": `export default ${getCustomReporterClass("CustomTestReporter")}`,
        // CJS reporter is assigned to module.exports
        "extra/cjs-reporter.cjs": `module.exports = ${getCustomReporterClass("CommonJSReporter")}`,
        // this one won't be referenced and shouldn't be initialized
        "unused-reporter.js": `export default ${getCustomReporterClass("UnusedReporter")}`,
      },
    });

    repo.install();

    const results = await repo.run("build", ["--reporter", "customTest", "--reporter", "cjs"]);
    const output = results.stdout + "\n" + results.stderr;

    // Check that custom reporters were used
    expect(output).toContain("hello from CustomTestReporter");
    expect(output).toContain("hello from CommonJSReporter");
    // but not the one that wasn't requested
    expect(output).not.toContain("hello from UnusedReporter");
  });

  it("should handle custom reporter with named export (ESM+CJS)", async () => {
    repo = new Monorepo("export-patterns");

    await initRepoWithReporters({
      reporters: {
        // absolute path to the ESM named reporter
        NamedReporter: path.join(repo.root, "stuff/named-export-reporter.mjs"),
        // this cjs file is just .js
        cjsNamedReporter: "./cjs-named-reporter.js",
      },
      packages: { a: {} },
      // Create a custom reporter with named export that is also the default
      extraFiles: {
        "stuff/named-export-reporter.mjs": `export ${getCustomReporterClass("NamedReporter")}`,
        "cjs-named-reporter.js": `exports.cjsNamedReporter = ${getCustomReporterClass("CjsNamedReporter")}`,
      },
    });

    repo.install();

    // Use a default reporter here too
    const results = await repo.run("build", [
      "--reporter",
      "NamedReporter",
      "--reporter",
      "cjsNamedReporter",
      "--reporter",
      "json",
      "--log-level",
      "silly",
    ]);
    const output = results.stdout + "\n" + results.stderr;

    // custom stuff is logged
    expect(output).toContain("hello from NamedReporter");
    expect(output).toContain("hello from CjsNamedReporter");

    // json is also logged
    const jsonOutput = parseNdJson(output);
    const statusEntries = getStatusEntriesData(jsonOutput);
    expect(statusEntries).toContainEqual({ target: { packageName: "a", task: "build" }, status: "success" });
  });

  // It's not necessary to have separate tests for different values like numbers, since these are
  // very expensive tests. Also skip testing the invalid syntax case (it's just an exception).
  it("should error when custom reporter does not export a valid class or object", async () => {
    repo = new Monorepo("string-export");

    await initRepoWithReporters({
      reporters: {
        bad: "./bad.mjs",
      },
      packages: { a: {} },
      extraFiles: {
        "bad.mjs": `export default 'hello'`,
      },
    });

    repo.install();

    // Should throw an error when trying to use a reporter that exports a string
    await expect(repo!.run("build", ["--reporter", "bad"])).rejects.toThrow(/does not export a valid reporter class or instance/);
  });

  it("should work with custom reporter that exports an object instance (and sends all logs)", async () => {
    repo = new Monorepo("object-instance");

    await initRepoWithReporters({
      reporters: {
        objectReporter: "./object-reporter.mjs",
      },
      packages: { a: {} },
      // Create a reporter that exports an object instance (not a class)
      extraFiles: {
        "object-reporter.mjs": `
const objectReporter = {
  events: [],
  log(entry) {
    entry.data?.target && entry.data.status && this.events.push({
      target: entry.data.target,
      status: entry.data.status
    });
  },
  summarize(summary) {
    console.log(JSON.stringify({
      trackingReporter: true,
      eventCount: this.events.length,
      summary: summary.results
    }));
  }
};

export default objectReporter;
      `,
      },
    });

    repo.install();

    const results = await repo.run("build", ["--reporter", "objectReporter"]);
    const output = results.stdout + "\n" + results.stderr;

    expect(output).toContain('"trackingReporter":true');
    expect(output).toMatch(/"eventCount":[1-9]/);
    expect(output).toContain('"summary":');
  });
});
