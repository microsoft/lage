import { Monorepo } from "./mock/monorepo.js";
import { getTargetId } from "@lage-run/target-graph";
import { filterEntry, parseNdJson } from "./parseNdJson.js";

describe("bigapp test", () => {
  // This test follows the model as documented here:
  // https://microsoft.github.io/lage/guide/levels.html
  it("with apps and libs and all, y'all", () => {
    const repo = new Monorepo("bigapp");

    repo.init();

    repo.addPackage("FooApp1", ["FooCore"]);
    repo.addPackage("FooApp2", ["FooCore"]);
    repo.addPackage("FooCore", ["BuildTool"]);
    repo.addPackage("BarPage", ["BarCore"]);
    repo.addPackage("BarCore", ["BuildTool"]);
    repo.addPackage("BuildTool");

    repo.install();

    const results = repo.run("test");
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    const indices: { [taskId: string]: number } = {};

    for (const pkg of ["FooApp1", "FooApp2", "FooCore", "BarCore", "BarPage", "BuildTool"]) {
      for (const task of ["build", "test"]) {
        indices[getTargetId(pkg, task)] = jsonOutput.findIndex((e) => filterEntry(e.data, pkg, task, "success"));
      }
    }

    expect(indices[getTargetId("BuildTool", "build")]).toBeLessThan(indices[getTargetId("BuildTool", "test")]);

    expect(indices[getTargetId("BuildTool", "build")]).toBeLessThan(indices[getTargetId("FooCore", "build")]);

    expect(indices[getTargetId("BuildTool", "build")]).toBeLessThan(indices[getTargetId("FooApp1", "build")]);

    expect(indices[getTargetId("BuildTool", "build")]).toBeLessThan(indices[getTargetId("FooApp2", "build")]);

    expect(indices[getTargetId("BuildTool", "build")]).toBeLessThan(indices[getTargetId("BarPage", "build")]);

    expect(indices[getTargetId("BuildTool", "build")]).toBeLessThan(indices[getTargetId("BarCore", "build")]);

    expect(indices[getTargetId("BarCore", "build")]).toBeLessThan(indices[getTargetId("BarPage", "build")]);

    expect(indices[getTargetId("FooCore", "build")]).toBeLessThan(indices[getTargetId("FooApp2", "build")]);

    expect(indices[getTargetId("FooCore", "build")]).toBeLessThan(indices[getTargetId("FooCore", "test")]);

    expect(indices[getTargetId("BarPage", "build")]).toBeLessThan(indices[getTargetId("BarPage", "test")]);

    repo.cleanup();
  });
});
