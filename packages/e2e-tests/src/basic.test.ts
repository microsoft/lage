import { Monorepo } from "./mock/monorepo.js";
import { filterEntry, parseNdJson } from "./parseNdJson.js";

describe("basics", () => {
  it("basic test case", () => {
    const repo = new Monorepo("basics");

    repo.init();
    repo.install();

    repo.addPackage("a", ["b"]);
    repo.addPackage("b");
    repo.linkPackages();

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
});
