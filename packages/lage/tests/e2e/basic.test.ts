import { Monorepo } from "../mock/monorepo";
import { parseNdJson } from "./parseNdJson";

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

    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "build", "completed"))).toBeTruthy();

    expect(jsonOutput.find((entry) => filterEntry(entry.data, "b", "test", "completed"))).toBeTruthy();

    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "build", "completed"))).toBeTruthy();

    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "test", "completed"))).toBeTruthy();

    expect(jsonOutput.find((entry) => filterEntry(entry.data, "a", "lint", "completed"))).toBeFalsy();

    repo.cleanup();
  });
});

function filterEntry(taskData, pkg, task, status) {
  return taskData && taskData.package === pkg && taskData.task === task && taskData.status === status;
}
