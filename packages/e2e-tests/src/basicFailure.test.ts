import { Monorepo } from "./mock/monorepo.js";
import { filterEntry, parseNdJson } from "./parseNdJson.js";

describe("basic failure case where a dependent target has failed", () => {
  it("when a failure happens, halts all other targets", async () => {
    const repo = new Monorepo("basics-failure-halt-all");

    repo.init();

    repo.addPackage("a", ["b"]);
    repo.addPackage("b", [], {
      build: 'node -e "process.exit(1);"',
    });
    repo.addPackage("c");
    repo.install();

    let jsonOutput: any[] = [];
    let results: any;

    try {
      repo.run("test");
    } catch (e) {
      results = e;
    }
    const output = results.stdout + results.stderr;

    jsonOutput = parseNdJson(output);

    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "build", "failed"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "test", "success"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "build", "success"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "test", "success"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "lint", "success"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "c", "test", "success"))).toBeFalsy();

    await repo.cleanup();
  });

  it("when a failure happens in `--continue` mode, halts all other dependent targets but continue to build as much as possible", async () => {
    const repo = new Monorepo("basics-failure-continue");

    repo.init();

    repo.addPackage("a", ["b"]);
    repo.addPackage("b", [], {
      build: 'node -e "process.exit(1);"',
    });
    repo.addPackage("c");
    repo.install();

    let jsonOutput: any[] = [];
    let results: any;

    try {
      repo.run("test", ["--continue"]);
    } catch (e) {
      results = e;
    }
    const output = results.stdout + results.stderr;

    jsonOutput = parseNdJson(output);

    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "build", "failed"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "test", "success"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "build", "success"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "test", "success"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "lint", "success"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "c", "test", "success"))).toBeTruthy();

    await repo.cleanup();
  });

  it("when a failure happens be sure to have exit code of !== 0", async () => {
    expect.hasAssertions();
    const repo = new Monorepo("basics-failure-exit-code");

    repo.init();

    repo.addPackage("a", ["b"]);
    repo.addPackage("b", [], {
      build: 'node -e "process.exit(1);"',
    });
    repo.addPackage("c");
    repo.addPackage("d");
    repo.addPackage("e");
    repo.install();

    try {
      repo.run("test");
    } catch (e) {
      const results = e as any;
      expect(results.exitCode).not.toBe(0);
    }

    await repo.cleanup();
  });

  it("when a failure happens in `--safe-exit`, be sure to have exit code of !== 0", async () => {
    expect.hasAssertions();
    const repo = new Monorepo("basics-safe-exit");

    repo.init();

    repo.addPackage("a", ["b"]);
    repo.addPackage("b", [], {
      build: 'node -e "process.exit(1);"',
    });
    repo.addPackage("c");
    repo.addPackage("d");
    repo.addPackage("e");
    repo.install();

    try {
      repo.run("test", ["--safe-exit"]);
    } catch (e) {
      const results = e as any;

      expect(results.exitCode).not.toBe(0);
      expect(results.stderr).not.toContain("Cannot read property 'stack' of undefined");
    }

    await repo.cleanup();
  });
});
