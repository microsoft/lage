import { Monorepo } from "../mock/monorepo";

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
    repo.addPackage("BuildTool");
    repo.linkPackages();

    const results = repo.run("test");
    const output = results.stdout + results.stderr;

    expect(output).toContain("b build success");
    expect(output).toContain("a build success");
    expect(output).toContain("a  test success");
    expect(output).toContain("b  test success");

    repo.cleanup();
  });
});
