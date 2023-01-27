import { Monorepo } from "./mock/monorepo.js";
import { filterEntry, parseNdJson } from "./parseNdJson.js";

describe("info command", () => {
  it("basic info test case", () => {
    const repo = new Monorepo("basics-info");

    repo.init();
    repo.addPackage("a", ["b"]);
    repo.addPackage("b");

    repo.install();

    const results = repo.run("test", ["--info"]);
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput.map((entry) => ({ ...entry, cwd: `/some/path/to/${entry.packageName}` }))).toMatchSnapshot();

    repo.cleanup();
  });

  it("scoped info test case", () => {
    const repo = new Monorepo("scoped-info");

    repo.init();
    repo.addPackage("a", ["b"]);
    repo.addPackage("b");

    repo.install();

    const results = repo.run("test", ["--info", "--to", "b"]);
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput.map((entry) => ({ ...entry, cwd: `/some/path/to/${entry.packageName}` }))).toMatchSnapshot();

    repo.cleanup();
  });
});
