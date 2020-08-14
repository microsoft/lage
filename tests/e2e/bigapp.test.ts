import { Monorepo } from "../mock/monorepo";
import { getTaskId } from "@microsoft/task-scheduler";
import { parseNdJson } from "./parseNdJson";

describe("bigapp test", () => {
  // This test follows the model as documented here:
  // https://microsoft.github.io/lage/guide/levels.html
  it("with apps and libs and all, y'all", () => {
    const repo = new Monorepo("bigapp");

    repo.init();
    repo.install();

    repo.addPackage("FooApp1", ["FooCore"]);
    repo.addPackage("FooApp2", ["FooCore"]);
    repo.addPackage("FooCore", ["BuildTool"]);
    repo.addPackage("BarPage", ["BarCore"]);
    repo.addPackage("BarCore", ["BuildTool"]);
    repo.addPackage("BuildTool");
    repo.linkPackages();

    const results = repo.run("test");
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    const indices: { [taskId: string]: number } = {};

    for (const pkg of [
      "FooApp1",
      "FooApp2",
      "FooCore",
      "BarCore",
      "BarPage",
      "BuildTool",
    ]) {
      for (const task of ["build", "test"]) {
        indices[getTaskId(pkg, task)] = jsonOutput.findIndex((e) =>
          filterEntry(e.data, pkg, task, "completed")
        );
      }
    }

    expect(indices[getTaskId("BuildTool", "build")]).toBeLessThan(
      indices[getTaskId("BuildTool", "test")]
    );

    expect(indices[getTaskId("BuildTool", "build")]).toBeLessThan(
      indices[getTaskId("FooCore", "build")]
    );

    expect(indices[getTaskId("BuildTool", "build")]).toBeLessThan(
      indices[getTaskId("FooApp1", "build")]
    );

    expect(indices[getTaskId("BuildTool", "build")]).toBeLessThan(
      indices[getTaskId("FooApp2", "build")]
    );

    expect(indices[getTaskId("BuildTool", "build")]).toBeLessThan(
      indices[getTaskId("BarPage", "build")]
    );

    expect(indices[getTaskId("BuildTool", "build")]).toBeLessThan(
      indices[getTaskId("BarCore", "build")]
    );

    expect(indices[getTaskId("BarCore", "build")]).toBeLessThan(
      indices[getTaskId("BarPage", "build")]
    );

    expect(indices[getTaskId("FooCore", "build")]).toBeLessThan(
      indices[getTaskId("FooApp2", "build")]
    );

    expect(indices[getTaskId("FooCore", "build")]).toBeLessThan(
      indices[getTaskId("FooCore", "test")]
    );

    expect(indices[getTaskId("BarPage", "build")]).toBeLessThan(
      indices[getTaskId("BarPage", "test")]
    );

    repo.cleanup();
  });
});

function filterEntry(taskData, pkg, task, status) {
  return (
    taskData &&
    taskData.package === pkg &&
    taskData.task === task &&
    taskData.status === status
  );
}
