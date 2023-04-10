import { Monorepo } from "./mock/monorepo.js";
import { filterEntry, parseNdJson } from "./parseNdJson.js";

describe("basics", () => {
  it("basic test case", () => {
    const repo = new Monorepo("basics");

    repo.init();

    console.log(repo.root);
    repo.addPackage("a", ["b"]);
    repo.addPackage("b");

    repo.install();

    const results = repo.run("test");
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "build", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "test", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "build", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "test", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "lint", "success"))).toBeFalsy();

    repo.cleanup();
  });

  it("basic with missing script names - logging should not include those targets", () => {
    const repo = new Monorepo("basics-missing-scripts");

    repo.init();
    repo.addPackage("a", ["b"]);
    repo.addPackage("b", [], {
      build: "node ./build.js",
      test: "node ./test.js",
      lint: "node ./lint.js",
      extra: "node ./extra.js",
    });

    repo.install();

    const results = repo.run("extra");
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "extra", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "test", "success"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "build", "success"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "test", "success"))).toBeFalsy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "lint", "success"))).toBeFalsy();

    repo.cleanup();
  });

  it("basic test case - with task args", () => {
    const repo = new Monorepo("basics-with-task-args");

    repo.init();
    repo.addPackage("a", ["b"]);
    repo.addPackage("b");

    repo.install();

    // run once without params
    repo.run("test");

    // run with some params, expected actual runs
    const results = repo.run("test", ["--1", "--2"]);
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "build", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "test", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "build", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "test", "success"))).toBeTruthy();
    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "lint", "success"))).toBeFalsy();

    // run with some params, expected skips
    const results2 = repo.run("test", ["--1", "--2"]);
    const output2 = results2.stdout + results2.stderr;
    const jsonOutput2 = parseNdJson(output2);

    expect(jsonOutput2.find((entry) => filterEntry(entry.data, "b", "build", "skipped"))).toBeTruthy();
    expect(jsonOutput2.find((entry) => filterEntry(entry.data, "b", "test", "skipped"))).toBeTruthy();
    expect(jsonOutput2.find((entry) => filterEntry(entry.data, "a", "build", "skipped"))).toBeTruthy();
    expect(jsonOutput2.find((entry) => filterEntry(entry.data, "a", "test", "skipped"))).toBeTruthy();
    expect(jsonOutput2.find((entry) => filterEntry(entry.data, "a", "lint", "skipped"))).toBeFalsy();

    // run with some lage specific params, expected skips
    const results3 = repo.run("test", ["--concurrency", "1"]);
    const output3 = results3.stdout + results3.stderr;
    const jsonOutput3 = parseNdJson(output3);

    expect(jsonOutput3.find((entry) => filterEntry(entry.data, "b", "build", "skipped"))).toBeTruthy();
    expect(jsonOutput3.find((entry) => filterEntry(entry.data, "b", "test", "skipped"))).toBeTruthy();
    expect(jsonOutput3.find((entry) => filterEntry(entry.data, "a", "build", "skipped"))).toBeTruthy();
    expect(jsonOutput3.find((entry) => filterEntry(entry.data, "a", "test", "skipped"))).toBeTruthy();
    expect(jsonOutput3.find((entry) => filterEntry(entry.data, "a", "lint", "skipped"))).toBeFalsy();

    // run with some params AND lage specific params, expected skips
    const results4 = repo.run("test", ["--1", "--2", "--concurrency", "1"]);
    const output4 = results4.stdout + results4.stderr;
    const jsonOutput4 = parseNdJson(output4);

    expect(jsonOutput4.find((entry) => filterEntry(entry.data, "b", "build", "skipped"))).toBeTruthy();
    expect(jsonOutput4.find((entry) => filterEntry(entry.data, "b", "test", "skipped"))).toBeTruthy();
    expect(jsonOutput4.find((entry) => filterEntry(entry.data, "a", "build", "skipped"))).toBeTruthy();
    expect(jsonOutput4.find((entry) => filterEntry(entry.data, "a", "test", "skipped"))).toBeTruthy();
    expect(jsonOutput4.find((entry) => filterEntry(entry.data, "a", "lint", "skipped"))).toBeFalsy();

    repo.cleanup();
  });
});
