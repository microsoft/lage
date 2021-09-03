import { Monorepo } from "../mock/monorepo";
import { getTargetId } from "../../src/task/taskId";
import { parseNdJson } from "./parseNdJson";

describe("transitive task deps test", () => {
  // This test follows the model as documented here:
  // https://microsoft.github.io/lage/guide/levels.html
  it("produces a build graph even when some scripts are missing in package.json", () => {
    const repo = new Monorepo("transitiveDeps");

    repo.init();
    repo.setLageConfig(`module.exports = {
      "pipeline": {
        "build": [ ],
        "bundle":["build"],
        "test": ["bundle"]
      }
    }`);
    repo.install();

    repo.addPackage("a", [], {
      build: "echo a:build",
      test: "echo a:test",
    });
    repo.addPackage("b", [], {
      build: "echo b:build",
    });
    repo.linkPackages();

    const results = repo.run("test");

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    const indices: { [taskId: string]: number } = {};

    for (const pkg of ["a", "b"]) {
      for (const task of ["build", "bundle", "test"]) {
        const index = jsonOutput.findIndex((e) => filterEntry(e.data, pkg, task, "completed"));
        if (index > -1) {
          indices[getTargetId(pkg, task)] = index;  
        }
      }
    }

    expect(indices[getTargetId("a", "build")]).toBeLessThan(indices[getTargetId("a", "test")]);

    expect(indices[getTargetId("b", "build")]).toBeLessThan(indices[getTargetId("a", "test")]);

    repo.cleanup();
  });
});

function filterEntry(taskData, pkg, task, status) {
  return taskData && taskData.package === pkg && taskData.task === task && taskData.status === status;
}
