import { Monorepo } from "./mock/monorepo.js";
import { filterEntry, parseNdJson } from "./parseNdJson.js";

describe("basic failure case where a dependent target has failed", () => {
  it("when a failure happens, halts all other targets", async () => {
    const repo = new Monorepo("basics-failure-halt-all");

    await repo.init();

    await repo.addPackage("a", ["b"]);
    await repo.addPackage("b", [], {
      build: 'node -e "process.exit(1);"',
    });
    await repo.addPackage("c");
    await repo.install();

    let jsonOutput: any[] = [];
    let results: any;

    try {
      await repo.run("test");
      expect(true).toBe(false); // should not get here
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

    await repo.init();

    await repo.addPackage("a", ["b"]);
    await repo.addPackage("b", [], {
      build: 'node -e "process.exit(1);"',
    });
    await repo.addPackage("c");
    await repo.install();

    let jsonOutput: any[] = [];
    let results: any;

    try {
      await repo.run("test", ["--continue"]);
      expect(true).toBe(false); // should not get here
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

    await repo.init();

    await repo.addPackage("a", ["b"]);
    await repo.addPackage("b", [], {
      build: 'node -e "process.exit(1);"',
    });
    await repo.addPackage("c");
    await repo.addPackage("d");
    await repo.addPackage("e");
    await repo.install();

    try {
      await repo.run("test");
      expect(true).toBe(false); // should not get here
    } catch (e) {
      const results = e as any;
      expect(results.exitCode).not.toBe(0);
    }

    await repo.cleanup();
  });
});
