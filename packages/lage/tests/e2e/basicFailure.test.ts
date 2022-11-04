import { Monorepo } from "../mock/monorepo";
import { parseNdJson } from "./parseNdJson";

describe("basic failure case where a dependent target has failed", () => {
  it("when a failure happens, halts all other targets", () => {
    const repo = new Monorepo("basics-fail-1");

    repo.init();
    repo.install();

    repo.addPackage("a", ["b"]);
    repo.addPackage("b", [], {
      build: 'node -e "process.exit(1);"',
    });
    repo.addPackage("c");
    repo.linkPackages();

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
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "test", "completed"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "build", "completed"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "test", "completed"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "lint", "completed"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "c", "test", "completed"))).toBeFalsy();

    repo.cleanup();
  });

  it("when a failure happens in `--continue` mode, halts all other dependent targets but continue to build as much as possible", () => {
    const repo = new Monorepo("basics-fail-continue-1");

    repo.init();
    repo.install();

    repo.addPackage("a", ["b"]);
    repo.addPackage("b", [], {
      build: 'node -e "process.exit(1);"',
    });
    repo.addPackage("c");
    repo.linkPackages();

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
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "test", "completed"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "build", "completed"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "test", "completed"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "lint", "completed"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "c", "test", "completed"))).toBeTruthy();

    repo.cleanup();
  });

  it("when a failure happens be sure to have exit code of !== 0", () => {
    expect.hasAssertions();
    const repo = new Monorepo("basics-fail-exit-1");

    repo.init();
    repo.install();

    repo.addPackage("a", ["b"]);
    repo.addPackage("b", [], {
      build: 'node -e "process.exit(1);"',
    });
    repo.addPackage("c");
    repo.addPackage("d");
    repo.addPackage("e");
    repo.linkPackages();

    try {
      repo.run("test");
    } catch (e) {
      const results = e as any;
      expect(results.exitCode).not.toBe(0);
    }

    repo.cleanup();
  });

  it("when a failure happens in `--safe-exit`, be sure to have exit code of !== 0", () => {
    expect.hasAssertions();
    const repo = new Monorepo("basic-safe-exit-1");

    repo.init();
    repo.install();

    repo.addPackage("a", ["b"]);
    repo.addPackage("b", [], {
      build: 'node -e "process.exit(1);"',
    });
    repo.addPackage("c");
    repo.addPackage("d");
    repo.addPackage("e");
    repo.linkPackages();

    try {
      repo.run("test", ["--safe-exit"]);
    } catch (e) {
      const results = e as any;

      expect(results.exitCode).not.toBe(0);
      expect(results.stderr).not.toContain("Cannot read property 'stack' of undefined");
    }

    repo.cleanup();
  });
});

function filterEntry(taskData, pkg, task, status) {
  return taskData && taskData.package === pkg && taskData.task === task && taskData.status === status;
}
