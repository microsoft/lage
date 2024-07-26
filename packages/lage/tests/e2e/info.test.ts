import { Monorepo } from "../mock/monorepo";
import { getTargetId } from "../../src/task/taskId";
import { parseNdJson } from "./parseNdJson";
import { silent } from "npmlog";
import exp from "constants";

describe("info test", () => {
  it("with json reporter", () => {
    const result = testInfoWithReporter("json");
    var resultObj = JSON.parse(result);
    // make deterministic
    resultObj.timestamp = 0;
    expect(JSON.stringify(resultObj)).toMatchSnapshot();
  });

  it("with dgml reporter", () => {
    const result = testInfoWithReporter("dgml");
    expect(result).toMatchSnapshot();
  });

  it("dependencies are resolved via noop tasks", () => {
    const repo = new Monorepo("noop-task-info");
    repo.init();
    repo.addPackage("a", ["b"], { build: "echo 'building a'" });
    // This task does not have a `build` script.
    repo.addPackage("b", ["c"], {});
    repo.addPackage("c", [], { build: "echo 'building c'" });
    repo.install();
    repo.linkPackages();

    const output = repo.run("writeInfo", ["test", "--reporter", "json"], true).stdout;
    const infoJsonOutput: any = JSON.parse(output);

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

function testInfoWithReporter(reporterName: string): string {
  const repo = new Monorepo("info-" + reporterName);

  repo.init();
  repo.install();

  repo.addPackage("FooApp1", ["FooCore"]);
  repo.addPackage("FooApp2", ["FooCore"]);
  repo.addPackage("FooCore", ["BuildTool"]);
  repo.addPackage("BarPage", ["BarCore"]);
  repo.addPackage("BarCore", ["BuildTool"]);
  repo.addPackage("BuildTool");
  repo.linkPackages();

  const results = repo.run("writeInfo", ["test", "--reporter", reporterName], true);
  expect(results.exitCode).toBe(0);
  expect(results.stderr).toBe("");

  repo.cleanup();

  return results.stdout;
}
