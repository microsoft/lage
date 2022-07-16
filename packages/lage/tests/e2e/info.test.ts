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
