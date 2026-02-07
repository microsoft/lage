import { Monorepo } from "./mock/monorepo.js";
import { filterEntry, parseNdJson } from "./parseNdJson.js";

describe("basics", () => {
  let repo: Monorepo | undefined;

  afterEach(async () => {
    await repo?.cleanup();
    repo = undefined;
  });

  it("basic test case", async () => {
    repo = new Monorepo("basics");

    await repo.init();
    await repo.addPackage("a", ["b"]);
    await repo.addPackage("b");

    await repo.install();

    const results = await repo.run("test");
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "build", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "test", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "build", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "test", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "lint", "success"))).toBeFalsy();
  });

  it("basic with missing script names - logging should not include those targets", async () => {
    repo = new Monorepo("basics-missing-scripts");

    await repo.init();
    await repo.addPackage("a", ["b"]);
    await repo.addPackage("b", [], {
      build: "node ./build.js",
      test: "node ./test.js",
      lint: "node ./lint.js",
      extra: "node ./extra.js",
    });

    await repo.install();

    const results = await repo.run("extra");
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "extra", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "test", "success"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "build", "success"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "test", "success"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "lint", "success"))).toBeFalsy();
  });

  it("basic test case - with task args", async () => {
    repo = new Monorepo("basics-with-task-args");

    await repo.init();
    await repo.addPackage("a", ["b"]);
    await repo.addPackage("b");

    await repo.install();

    // run once without params
    await repo.run("test");

    // run with some params, expected actual runs
    const results = await repo.run("test", ["--1", "--2"]);
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "build", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "test", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "build", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "test", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "lint", "success"))).toBeFalsy();

    // run with some params, expected skips
    const results2 = await repo.run("test", ["--1", "--2"]);
    const output2 = results2.stdout + results2.stderr;
    const jsonOutput2 = parseNdJson(output2);

    expect(jsonOutput2.find((entry) => filterEntry(entry.data, "b", "build", "skipped"))).toBeTruthy();
    expect(jsonOutput2.find((entry) => filterEntry(entry.data, "b", "test", "skipped"))).toBeTruthy();
    expect(jsonOutput2.find((entry) => filterEntry(entry.data, "a", "build", "skipped"))).toBeTruthy();
    expect(jsonOutput2.find((entry) => filterEntry(entry.data, "a", "test", "skipped"))).toBeTruthy();
    expect(jsonOutput2.find((entry) => filterEntry(entry.data, "a", "lint", "skipped"))).toBeFalsy();

    // run with some lage specific params, expected skips
    const results3 = await repo.run("test", ["--concurrency", "1"]);
    const output3 = results3.stdout + results3.stderr;
    const jsonOutput3 = parseNdJson(output3);

    expect(jsonOutput3.find((entry) => filterEntry(entry.data, "b", "build", "skipped"))).toBeTruthy();
    expect(jsonOutput3.find((entry) => filterEntry(entry.data, "b", "test", "skipped"))).toBeTruthy();
    expect(jsonOutput3.find((entry) => filterEntry(entry.data, "a", "build", "skipped"))).toBeTruthy();
    expect(jsonOutput3.find((entry) => filterEntry(entry.data, "a", "test", "skipped"))).toBeTruthy();
    expect(jsonOutput3.find((entry) => filterEntry(entry.data, "a", "lint", "skipped"))).toBeFalsy();

    // run with some params AND lage specific params, expected skips
    const results4 = await repo.run("test", ["--1", "--2", "--concurrency", "1"]);
    const output4 = results4.stdout + results4.stderr;
    const jsonOutput4 = parseNdJson(output4);

    expect(jsonOutput4.find((entry) => filterEntry(entry.data, "b", "build", "skipped"))).toBeTruthy();
    expect(jsonOutput4.find((entry) => filterEntry(entry.data, "b", "test", "skipped"))).toBeTruthy();
    expect(jsonOutput4.find((entry) => filterEntry(entry.data, "a", "build", "skipped"))).toBeTruthy();
    expect(jsonOutput4.find((entry) => filterEntry(entry.data, "a", "test", "skipped"))).toBeTruthy();
    expect(jsonOutput4.find((entry) => filterEntry(entry.data, "a", "lint", "skipped"))).toBeFalsy();
  });

  it("works in repo with spaces", async () => {
    repo = new Monorepo("spaces why");

    await repo.init();
    await repo.addPackage("a", ["b"]);
    await repo.addPackage("b");

    await repo.install();

    const results = await repo.run("test");
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "build", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "test", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "build", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "test", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "lint", "success"))).toBeFalsy();
  });
});
