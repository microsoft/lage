import { PackageInfos } from "workspace-tools";
import { START_TARGET_ID, TargetGraphBuilder } from "../src/target-graph-builder";

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

describe("target graph builder", () => {
  it("should build a target based on a simple package graph and task graph", () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
    });

    const builder = new TargetGraphBuilder(root, packageInfos);
    builder.addTargetConfig("build", {
      dependsOn: ["^build"],
    });

    const targetGraph = builder.buildTargetGraph(["build"]);

    expect(targetGraph.targets.size).toBe(2);

    expect(targetGraph.dependencies.length).toBe(3);
    expect(targetGraph.dependencies).toContainEqual([START_TARGET_ID, "a#build"]);
    expect(targetGraph.dependencies).toContainEqual([START_TARGET_ID, "b#build"]);
    expect(targetGraph.dependencies).toContainEqual(["b#build", "a#build"]);
  });

  it("should generate target graphs for tasks that do not depend on each other", () => {
    const root = "/repos/a";
    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
    });

    const builder = new TargetGraphBuilder(root, packageInfos);
    builder.addTargetConfig("test");
    builder.addTargetConfig("lint");

    const targetGraph = builder.buildTargetGraph(["test", "lint"]);

    expect(targetGraph.targets.size).toBe(4);
    expect(targetGraph.dependencies).toMatchInlineSnapshot(`
      Array [
        Array [
          "__start",
          "a#test",
        ],
        Array [
          "__start",
          "b#test",
        ],
        Array [
          "__start",
          "a#lint",
        ],
        Array [
          "__start",
          "b#lint",
        ],
      ]
    `);
  });

  it("should generate targetGraph with some specific package task target dependencies", () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
      c: ["b"],
    });

    const builder = new TargetGraphBuilder(root, packageInfos);

    builder.addTargetConfig("build", {
      dependsOn: ["^build"],
    });

    builder.addTargetConfig("a#build", {
      dependsOn: [],
    });

    const targetGraph = builder.buildTargetGraph(["build"]);
    expect(targetGraph.dependencies).toMatchInlineSnapshot(`
Array [
  Array [
    "__start",
    "a#build",
  ],
  Array [
    "__start",
    "b#build",
  ],
  Array [
    "__start",
    "c#build",
  ],
  Array [
    "__start",
    "a#build",
  ],
  Array [
    "b#build",
    "c#build",
  ],
]
`);
  });

  it("should generate targetGraph with transitive dependencies", () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: ["b"],
      b: ["c"],
      c: [],
    });

    const builder = new TargetGraphBuilder(root, packageInfos);

    builder.addTargetConfig("bundle", {
      dependsOn: ["^^transpile"],
    });

    builder.addTargetConfig("transpile");

    const targetGraph = builder.buildTargetGraph(["bundle"], ["a"]);
    expect(targetGraph.dependencies).toMatchInlineSnapshot(`
Array [
  Array [
    "__start",
    "a#bundle",
  ],
  Array [
    "b#transpile",
    "a#bundle",
  ],
  Array [
    "c#transpile",
    "a#bundle",
  ],
  Array [
    "__start",
    "b#transpile",
  ],
  Array [
    "__start",
    "c#transpile",
  ],
]
`);
  });

  it("should generate target graph for a general task on a specific target", () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: [],
      b: [],
      c: [],
      common: [],
    });

    const builder = new TargetGraphBuilder(root, packageInfos);

    builder.addTargetConfig("build", {
      dependsOn: ["common#copy", "^build"],
    });
    builder.addTargetConfig("common#copy");
    builder.addTargetConfig("common#build");

    const targetGraph = builder.buildTargetGraph(["build"]);
    expect(targetGraph.dependencies).toMatchInlineSnapshot(`
Array [
  Array [
    "__start",
    "a#build",
  ],
  Array [
    "__start",
    "b#build",
  ],
  Array [
    "__start",
    "c#build",
  ],
  Array [
    "__start",
    "common#build",
  ],
  Array [
    "__start",
    "common#build",
  ],
  Array [
    "common#copy",
    "a#build",
  ],
  Array [
    "common#copy",
    "b#build",
  ],
  Array [
    "common#copy",
    "c#build",
  ],
  Array [
    "__start",
    "common#copy",
  ],
]
`);
  });
});
