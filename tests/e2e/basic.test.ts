import { Monorepo } from "../mock/monorepo";

describe("basics", () => {
  it("basic test case", () => {
    const repo = new Monorepo("basics");

    repo.init();

    repo.addPackage("a", ["b"]);
    repo.addPackage("b");
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
