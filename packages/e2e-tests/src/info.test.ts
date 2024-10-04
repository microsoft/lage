import { Monorepo } from "./mock/monorepo.js";
import { parseNdJson } from "./parseNdJson.js";

describe("info command", () => {
  it("basic info test case", () => {
    const repo = new Monorepo("basics-info");

    repo.init();
    repo.addPackage("a", ["b"]);
    repo.addPackage("b");

    repo.install();

    const results = repo.run("writeInfo", ["test"]);
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput).toMatchSnapshot();

    repo.cleanup();
  });

  it("scoped info test case", () => {
    const repo = new Monorepo("scoped-info");

    repo.init();
    repo.addPackage("a", ["b"]);
    repo.addPackage("b");

    repo.install();

    const results = repo.run("writeInfo", ["test", "--to", "b"]);
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);
    expect(jsonOutput).toMatchSnapshot();

    repo.cleanup();
  });

  it("dependencies are resolved via noop tasks", () => {
    const repo = new Monorepo("noop-task-info");
    repo.init();
    repo.addPackage("a", ["b"], { build: "echo 'building a'" });
    // This task does not have a `build` script.
    repo.addPackage("b", ["c"], {});
    repo.addPackage("c", [], { build: "echo 'building c'" });
    repo.install();

    const results = repo.run("writeInfo", ["build", "prepare"]);

    const output = results.stdout + results.stderr;
    const infoJsonOutput: any = parseNdJson(output)[0];
    const { packageTasks } = infoJsonOutput.data;

    // Check if task `a#build` depends on `c#build`, because package `b` doesn't
    // have a `build` task so dependencies are hoisted up.
    const task = packageTasks.find(({ id }) => id === "a#build");
    expect(task.dependencies).toEqual(["c#build"]);

    // Make sure all dependencies points to an existing task.
    for (const task of packageTasks) {
      for (const dependency of task.dependencies) {
        expect(packageTasks.some(({ id }) => id === dependency)).toBeTruthy();
      }
    }

    repo.cleanup();
  });
});
