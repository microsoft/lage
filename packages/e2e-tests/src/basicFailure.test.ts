import type execa from "execa";
import { Monorepo } from "./mock/monorepo.js";
import { getStatusEntriesData, parseNdJson } from "./parseNdJson.js";
describe("basic failure case where a dependent target has failed", () => {
  let repo: Monorepo | undefined;

  afterEach(async () => {
    await repo?.cleanup();
    repo = undefined;
  });

  it("when a failure happens, halts all other targets", async () => {
    repo = new Monorepo("basics-failure-halt-all");

    await repo.init({
      packages: {
        a: { internalDeps: ["b"] },
        b: { scripts: { build: 'node -e "process.exit(1);"' } },
        c: {},
      },
    });
    repo.install();

    let results: execa.ExecaError<string> | undefined;

    try {
      await repo.run("test");
    } catch (e) {
      results = e as execa.ExecaError<string>;
      expect(results.exitCode).not.toBe(0);
    }
    expect(results).toBeTruthy();
    const output = results!.stdout + results!.stderr;

    const jsonOutput = parseNdJson(output);
    const statusEntries = getStatusEntriesData(jsonOutput);

    expect(statusEntries).toContainEqual({ target: { packageName: "b", task: "build" }, status: "failed" });
    expect(statusEntries).not.toContainEqual({ target: { packageName: "b", task: "test" }, status: "success" });
    expect(statusEntries).not.toContainEqual({ target: { packageName: "a", task: "build" }, status: "success" });
    expect(statusEntries).not.toContainEqual({ target: { packageName: "a", task: "test" }, status: "success" });
    expect(statusEntries).not.toContainEqual({ target: { packageName: "a", task: "lint" }, status: "success" });
    expect(statusEntries).not.toContainEqual({ target: { packageName: "c", task: "test" }, status: "success" });
  });

  it("when a failure happens in `--continue` mode, halts all other dependent targets but continue to build as much as possible", async () => {
    repo = new Monorepo("basics-failure-continue");

    await repo.init({
      packages: {
        a: { internalDeps: ["b"] },
        b: { scripts: { build: 'node -e "process.exit(1);"' } },
        c: {},
      },
    });
    repo.install();

    let results: execa.ExecaError<string> | undefined;

    try {
      await repo.run("test", ["--continue"]);
      expect(true).toBe(false); // should not get here
    } catch (e) {
      results = e as execa.ExecaError<string>;
      expect(results.exitCode).not.toBe(0);
    }
    expect(results).toBeTruthy();
    const output = results!.stdout + results!.stderr;

    const jsonOutput = parseNdJson(output);
    const statusEntries = getStatusEntriesData(jsonOutput);

    expect(statusEntries).toContainEqual({ target: { packageName: "b", task: "build" }, status: "failed" });
    expect(statusEntries).not.toContainEqual({ target: { packageName: "b", task: "test" }, status: "success" });
    expect(statusEntries).not.toContainEqual({ target: { packageName: "a", task: "build" }, status: "success" });
    expect(statusEntries).not.toContainEqual({ target: { packageName: "a", task: "test" }, status: "success" });
    expect(statusEntries).not.toContainEqual({ target: { packageName: "a", task: "lint" }, status: "success" });
    expect(statusEntries).toContainEqual({ target: { packageName: "c", task: "test" }, status: "success" });
  });
});
