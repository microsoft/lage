import { Monorepo } from "./mock/monorepo.js";
import { getTargetId } from "@lage-run/target-graph";
import { getStatusIndices, parseNdJson } from "./parseNdJson.js";

describe("bigapp test", () => {
  let repo: Monorepo | undefined;

  afterEach(async () => {
    await repo?.cleanup();
    repo = undefined;
  });

  // This test follows the model as documented here:
  // https://microsoft.github.io/lage/guide/levels.html
  it("with apps and libs and all, y'all", async () => {
    repo = new Monorepo("bigapp");

    await repo.init({
      packages: {
        FooApp1: { internalDeps: ["FooCore"] },
        FooApp2: { internalDeps: ["FooCore"] },
        FooCore: { internalDeps: ["BuildTool"] },
        BarPage: { internalDeps: ["BarCore"] },
        BarCore: { internalDeps: ["BuildTool"] },
        BuildTool: {},
      },
    });

    repo.install();

    const results = await repo.run("test");
    const jsonOutput = parseNdJson(results.stdout, results.stderr);
    const indices = getStatusIndices({
      entries: jsonOutput,
      packages: ["FooApp1", "FooApp2", "FooCore", "BarCore", "BarPage", "BuildTool"],
      tasks: ["build", "test"],
      status: "success",
    });

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
  });
});
