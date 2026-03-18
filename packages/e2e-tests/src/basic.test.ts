import { Monorepo } from "./mock/monorepo.js";
import { getStatusEntriesData, parseNdJson } from "./parseNdJson.js";

describe("basics", () => {
  let repo: Monorepo | undefined;

  afterEach(async () => {
    await repo?.cleanup();
    repo = undefined;
  });

  it("basic test case", async () => {
    repo = new Monorepo("basics");

    await repo.init({
      packages: { a: { internalDeps: ["b"] }, b: {} },
    });

    await repo.install();

    const results = await repo.run("test");
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);
    const statusEntries = getStatusEntriesData(jsonOutput);

    expect(statusEntries).toContainEqual({ target: { packageName: "b", task: "build" }, status: "success" });
    expect(statusEntries).toContainEqual({ target: { packageName: "b", task: "test" }, status: "success" });
    expect(statusEntries).toContainEqual({ target: { packageName: "a", task: "build" }, status: "success" });
    expect(statusEntries).toContainEqual({ target: { packageName: "a", task: "test" }, status: "success" });
    expect(statusEntries).not.toContainEqual({ target: { packageName: "a", task: "lint" }, status: "success" });
  });

  it("basic with missing script names - logging should not include those targets", async () => {
    repo = new Monorepo("basics-missing-scripts");

    await repo.init({
      packages: {
        a: { internalDeps: ["b"] },
        b: {
          scripts: {
            build: "node ./build.js",
            test: "node ./test.js",
            lint: "node ./lint.js",
            extra: "node ./extra.js",
          },
        },
      },
    });

    await repo.install();

    const results = await repo.run("extra");
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);
    const statusEntries = getStatusEntriesData(jsonOutput);

    expect(statusEntries).toContainEqual({ target: { packageName: "b", task: "extra" }, status: "success" });
    expect(statusEntries).not.toContainEqual({ target: { packageName: "b", task: "test" }, status: "success" });
    expect(statusEntries).not.toContainEqual({ target: { packageName: "a", task: "build" }, status: "success" });
    expect(statusEntries).not.toContainEqual({ target: { packageName: "a", task: "test" }, status: "success" });
    expect(statusEntries).not.toContainEqual({ target: { packageName: "a", task: "lint" }, status: "success" });
  });

  it("basic test case - with task args", async () => {
    repo = new Monorepo("basics-with-task-args");

    await repo.init({
      packages: { a: { internalDeps: ["b"] }, b: {} },
    });

    await repo.install();

    // run once without params
    await repo.run("test");

    // run with some params, expected actual runs
    const results = await repo.run("test", ["--1", "--2"]);
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);
    const statusEntries = getStatusEntriesData(jsonOutput);

    expect(statusEntries).toContainEqual({ target: { packageName: "b", task: "build" }, status: "success" });
    expect(statusEntries).toContainEqual({ target: { packageName: "b", task: "test" }, status: "success" });
    expect(statusEntries).toContainEqual({ target: { packageName: "a", task: "build" }, status: "success" });
    expect(statusEntries).toContainEqual({ target: { packageName: "a", task: "test" }, status: "success" });
    expect(statusEntries).not.toContainEqual({ target: { packageName: "a", task: "lint" }, status: "success" });

    // run with some params, expected skips
    const results2 = await repo.run("test", ["--1", "--2"]);
    const output2 = results2.stdout + results2.stderr;
    const jsonOutput2 = parseNdJson(output2);
    const statusEntries2 = getStatusEntriesData(jsonOutput2);

    expect(statusEntries2).toContainEqual({ target: { packageName: "b", task: "build" }, status: "skipped" });
    expect(statusEntries2).toContainEqual({ target: { packageName: "b", task: "test" }, status: "skipped" });
    expect(statusEntries2).toContainEqual({ target: { packageName: "a", task: "build" }, status: "skipped" });
    expect(statusEntries2).toContainEqual({ target: { packageName: "a", task: "test" }, status: "skipped" });
    expect(statusEntries2).not.toContainEqual({ target: { packageName: "a", task: "lint" }, status: "skipped" });

    // run with some lage specific params, expected skips
    const results3 = await repo.run("test", ["--concurrency", "1"]);
    const output3 = results3.stdout + results3.stderr;
    const jsonOutput3 = parseNdJson(output3);
    const statusEntries3 = getStatusEntriesData(jsonOutput3);

    expect(statusEntries3).toContainEqual({ target: { packageName: "b", task: "build" }, status: "skipped" });
    expect(statusEntries3).toContainEqual({ target: { packageName: "b", task: "test" }, status: "skipped" });
    expect(statusEntries3).toContainEqual({ target: { packageName: "a", task: "build" }, status: "skipped" });
    expect(statusEntries3).toContainEqual({ target: { packageName: "a", task: "test" }, status: "skipped" });
    expect(statusEntries3).not.toContainEqual({ target: { packageName: "a", task: "lint" }, status: "skipped" });

    // run with some params AND lage specific params, expected skips
    const results4 = await repo.run("test", ["--1", "--2", "--concurrency", "1"]);
    const output4 = results4.stdout + results4.stderr;
    const jsonOutput4 = parseNdJson(output4);
    const statusEntries4 = getStatusEntriesData(jsonOutput4);

    expect(statusEntries4).toContainEqual({ target: { packageName: "b", task: "build" }, status: "skipped" });
    expect(statusEntries4).toContainEqual({ target: { packageName: "b", task: "test" }, status: "skipped" });
    expect(statusEntries4).toContainEqual({ target: { packageName: "a", task: "build" }, status: "skipped" });
    expect(statusEntries4).toContainEqual({ target: { packageName: "a", task: "test" }, status: "skipped" });
    expect(statusEntries4).not.toContainEqual({ target: { packageName: "a", task: "lint" }, status: "skipped" });
  });

  it("works in repo with spaces", async () => {
    repo = new Monorepo("spaces why");

    await repo.init({
      packages: { a: { internalDeps: ["b"] }, b: {} },
    });

    await repo.install();

    const results = await repo.run("test");
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);
    const statusEntries = getStatusEntriesData(jsonOutput);

    expect(statusEntries).toContainEqual({ target: { packageName: "b", task: "build" }, status: "success" });
    expect(statusEntries).toContainEqual({ target: { packageName: "b", task: "test" }, status: "success" });
    expect(statusEntries).toContainEqual({ target: { packageName: "a", task: "build" }, status: "success" });
    expect(statusEntries).toContainEqual({ target: { packageName: "a", task: "test" }, status: "success" });
    expect(statusEntries).not.toContainEqual({ target: { packageName: "a", task: "lint" }, status: "success" });
  });
});
