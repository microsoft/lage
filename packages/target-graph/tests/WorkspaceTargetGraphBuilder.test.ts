import type { PackageInfos } from "workspace-tools";
import { WorkspaceTargetGraphBuilder } from "../src/WorkspaceTargetGraphBuilder.js";
import type { TargetGraph } from "../src/types/TargetGraph.js";

function createPackageInfo(packages: { [id: string]: string[] }) {
  const packageInfos: PackageInfos = {};
  Object.keys(packages).forEach((id) => {
    packageInfos[id] = {
      packageJsonPath: `/path/to/${id}/package.json`,
      name: id,
      version: "1.0.0",
      dependencies: packages[id].reduce((acc, dep) => {
        return { ...acc, [dep]: "*" };
      }, {}),
    };
  });

  return packageInfos;
}

function getGraphFromTargets(targetGraph: TargetGraph) {
  const graph: [string, string][] = [];
  for (const target of targetGraph.targets.values()) {
    for (const dep of target.dependencies) {
      graph.push([dep, target.id]);
    }
  }

  return graph;
}

describe("workspace target graph builder", () => {
  it("should build a target based on a simple package graph and task graph", async () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
    });

    const builder = new WorkspaceTargetGraphBuilder(root, packageInfos);
    builder.addTargetConfig("build", {
      dependsOn: ["^build"],
    });

    const targetGraph = await builder.build(["build"]);

    // size is 3, because we also need to account for the root target node (start target ID)
    expect(targetGraph.targets.size).toBe(3);

    expect(getGraphFromTargets(targetGraph)).toMatchInlineSnapshot(`
      [
        [
          "__start",
          "a#build",
        ],
        [
          "b#build",
          "a#build",
        ],
        [
          "__start",
          "b#build",
        ],
      ]
    `);
  });

  it("should generate target graphs for tasks that do not depend on each other", async () => {
    const root = "/repos/a";
    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
    });

    const builder = new WorkspaceTargetGraphBuilder(root, packageInfos);
    builder.addTargetConfig("test");
    builder.addTargetConfig("lint");

    const targetGraph = await builder.build(["test", "lint"]);

    // includes the pseudo-target for the "start" target
    expect(targetGraph.targets.size).toBe(5);
    expect(getGraphFromTargets(targetGraph)).toMatchInlineSnapshot(`
      [
        [
          "__start",
          "a#test",
        ],
        [
          "__start",
          "b#test",
        ],
        [
          "__start",
          "a#lint",
        ],
        [
          "__start",
          "b#lint",
        ],
      ]
    `);
  });

  it("should generate targetGraph with some specific package task target dependencies, running against all packages", async () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
      c: ["b"],
    });

    const builder = new WorkspaceTargetGraphBuilder(root, packageInfos);

    builder.addTargetConfig("build", {
      dependsOn: ["^build"],
    });

    builder.addTargetConfig("a#build", {
      dependsOn: [],
    });

    const targetGraph = await builder.build(["build"]);
    expect(getGraphFromTargets(targetGraph)).toMatchInlineSnapshot(`
      [
        [
          "__start",
          "a#build",
        ],
        [
          "__start",
          "b#build",
        ],
        [
          "__start",
          "c#build",
        ],
        [
          "b#build",
          "c#build",
        ],
      ]
    `);
  });

  it("should generate targetGraph with some specific package task target dependencies, running against a specific package", async () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
      c: ["b"],
    });

    const builder = new WorkspaceTargetGraphBuilder(root, packageInfos);

    builder.addTargetConfig("build", {
      dependsOn: ["^build"],
    });

    builder.addTargetConfig("a#build", {
      dependsOn: [],
    });

    const targetGraph = await builder.build(["build"], ["a", "b"]);
    expect(getGraphFromTargets(targetGraph)).toMatchInlineSnapshot(`
      [
        [
          "__start",
          "a#build",
        ],
        [
          "__start",
          "b#build",
        ],
      ]
    `);
  });

  it("should generate targetGraph with transitive dependencies", async () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: ["b"],
      b: ["c"],
      c: [],
    });

    const builder = new WorkspaceTargetGraphBuilder(root, packageInfos);

    builder.addTargetConfig("bundle", {
      dependsOn: ["^^transpile"],
    });

    builder.addTargetConfig("transpile");

    const targetGraph = await builder.build(["bundle"], ["a"]);
    expect(getGraphFromTargets(targetGraph)).toMatchInlineSnapshot(`
      [
        [
          "__start",
          "a#bundle",
        ],
        [
          "b#transpile",
          "a#bundle",
        ],
        [
          "c#transpile",
          "a#bundle",
        ],
        [
          "__start",
          "b#transpile",
        ],
        [
          "__start",
          "c#transpile",
        ],
      ]
    `);
  });

  it("should generate target graph for a general task on a specific target", async () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: [],
      b: [],
      c: [],
      common: [],
    });

    const builder = new WorkspaceTargetGraphBuilder(root, packageInfos);

    builder.addTargetConfig("build", {
      dependsOn: ["common#copy", "^build"],
    });

    builder.addTargetConfig("common#copy");
    builder.addTargetConfig("common#build");

    const targetGraph = await builder.build(["build"]);
    expect(getGraphFromTargets(targetGraph)).toMatchInlineSnapshot(`
      [
        [
          "__start",
          "a#build",
        ],
        [
          "common#copy",
          "a#build",
        ],
        [
          "__start",
          "b#build",
        ],
        [
          "common#copy",
          "b#build",
        ],
        [
          "__start",
          "c#build",
        ],
        [
          "common#copy",
          "c#build",
        ],
        [
          "__start",
          "common#build",
        ],
        [
          "__start",
          "common#copy",
        ],
      ]
    `);
  });

  it("should build a target graph with global task as a dependency", async () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
    });

    const builder = new WorkspaceTargetGraphBuilder(root, packageInfos);
    builder.addTargetConfig("build", {
      dependsOn: ["^build", "#global:task"],
    });

    builder.addTargetConfig("#global:task", {
      dependsOn: [],
    });

    const targetGraph = await builder.build(["build"]);

    expect(getGraphFromTargets(targetGraph)).toMatchInlineSnapshot(`
      [
        [
          "__start",
          "a#build",
        ],
        [
          "b#build",
          "a#build",
        ],
        [
          "#global:task",
          "a#build",
        ],
        [
          "__start",
          "b#build",
        ],
        [
          "#global:task",
          "b#build",
        ],
        [
          "__start",
          "#global:task",
        ],
      ]
    `);
  });

  it("should build a target graph with global task on its own", async () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
    });

    const builder = new WorkspaceTargetGraphBuilder(root, packageInfos);
    builder.addTargetConfig("build", {
      dependsOn: ["^build", "#global:task"],
    });

    builder.addTargetConfig("#global:task", {
      dependsOn: [],
    });

    const targetGraph = await builder.build(["global:task"]);

    expect(getGraphFromTargets(targetGraph)).toMatchInlineSnapshot(`
      [
        [
          "__start",
          "#global:task",
        ],
      ]
    `);
  });

  it("should build a target graph without including global task", async () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
    });

    const builder = new WorkspaceTargetGraphBuilder(root, packageInfos);
    builder.addTargetConfig("build", {
      dependsOn: ["^build"],
    });

    builder.addTargetConfig("#global:task", {
      dependsOn: [],
    });

    const targetGraph = await builder.build(["build"]);

    expect(getGraphFromTargets(targetGraph)).toMatchInlineSnapshot(`
      [
        [
          "__start",
          "a#build",
        ],
        [
          "b#build",
          "a#build",
        ],
        [
          "__start",
          "b#build",
        ],
      ]
    `);
  });
});
