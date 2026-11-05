import { describe, expect, it } from "@jest/globals";
import { TargetGraphBuilder } from "../TargetGraphBuilder.js";
import type { Target } from "../types/Target.js";

describe("Target Graph Builder", () => {
  it("should build a full graph", () => {
    const target1 = createTarget("a", "build", 1);
    const target2 = createTarget("b", "build", 1);

    const builder = new TargetGraphBuilder();
    builder.addTarget(target1);
    builder.addTarget(target2);
    builder.addDependency(target1.id, target2.id);

    // __start --> a#build --> b#build
    const targetGraph = builder.build();

    expect(simplify(targetGraph.targets)).toMatchInlineSnapshot(`
      [
        {
          "dependencies": [],
          "dependents": [
            "a#build",
            "b#build",
          ],
          "id": "__start",
          "priority": 2,
        },
        {
          "dependencies": [
            "__start",
          ],
          "dependents": [
            "b#build",
          ],
          "id": "a#build",
          "priority": 2,
        },
        {
          "dependencies": [
            "__start",
            "a#build",
          ],
          "dependents": [],
          "id": "b#build",
          "priority": 1,
        },
      ]
    `);
  });

  it("should build a subgraph", () => {
    const target1 = createTarget("a", "build", 1);
    const target2 = createTarget("b", "build", 1);
    const target3 = createTarget("c", "build", 1);
    const target4 = createTarget("d", "build", 1);

    const builder = new TargetGraphBuilder();
    builder.addTarget(target1);
    builder.addTarget(target2);
    builder.addTarget(target3);
    builder.addTarget(target4);
    builder.addDependency(target1.id, target2.id);
    builder.addDependency(target1.id, target3.id);
    builder.addDependency(target4.id, target1.id);

    // __start --> d#build --> a#build --> b#build
    //                                 --> c#build
    const targetGraph = builder.subgraph(["a#build"]);

    expect(simplify(targetGraph.targets)).toMatchInlineSnapshot(`
      [
        {
          "dependencies": [],
          "dependents": [
            "a#build",
            "d#build",
          ],
          "id": "__start",
          "priority": 2,
        },
        {
          "dependencies": [
            "__start",
            "d#build",
          ],
          "dependents": [],
          "id": "a#build",
          "priority": 1,
        },
        {
          "dependencies": [
            "__start",
          ],
          "dependents": [
            "a#build",
          ],
          "id": "d#build",
          "priority": 2,
        },
      ]
    `);
  });

  it("should build a subgraph with proper priorities", () => {
    const target1 = createTarget("a", "build", 1);
    const target2 = createTarget("b", "build", 100);
    const target3 = createTarget("c", "build", 1);
    const target4 = createTarget("d", "build", 1);

    const builder = new TargetGraphBuilder();
    builder.addTarget(target1);
    builder.addTarget(target2);
    builder.addTarget(target3);
    builder.addTarget(target4);
    builder.addDependency(target2.id, target1.id);
    builder.addDependency(target3.id, target1.id);
    builder.addDependency(target4.id, target1.id);

    // __start --> b#build --> a#build
    //         --> c#build --> a#build
    //         --> d#build --> a#build
    const targetGraph = builder.subgraph(["a#build"]);

    expect(simplify(targetGraph.targets)).toMatchInlineSnapshot(`
      [
        {
          "dependencies": [],
          "dependents": [
            "a#build",
            "b#build",
            "c#build",
            "d#build",
          ],
          "id": "__start",
          "priority": 101,
        },
        {
          "dependencies": [
            "__start",
            "b#build",
            "c#build",
            "d#build",
          ],
          "dependents": [],
          "id": "a#build",
          "priority": 1,
        },
        {
          "dependencies": [
            "__start",
          ],
          "dependents": [
            "a#build",
          ],
          "id": "b#build",
          "priority": 101,
        },
        {
          "dependencies": [
            "__start",
          ],
          "dependents": [
            "a#build",
          ],
          "id": "c#build",
          "priority": 2,
        },
        {
          "dependencies": [
            "__start",
          ],
          "dependents": [
            "a#build",
          ],
          "id": "d#build",
          "priority": 2,
        },
      ]
    `);
  });

  it("preserves shared dependencies, entry order and priorities without modifying the source graph", () => {
    const builder = new TargetGraphBuilder();
    for (const [name, priority] of [
      ["a", 5],
      ["b", 2],
      ["c", 3],
      ["d", 7],
      ["outside", 1],
    ] as const) {
      builder.addTarget(createTarget(name, "build", priority));
    }
    builder.addDependency("b#build", "a#build");
    builder.addDependency("c#build", "a#build");
    builder.addDependency("d#build", "b#build");
    builder.addDependency("d#build", "c#build");
    const originalTargets = [...builder.targets.values()].map((target) => ({
      ...target,
      dependencies: [...target.dependencies],
      dependents: [...target.dependents],
    }));

    const graph = builder.subgraph(["a#build", "c#build", "a#build", "missing#build"]);

    expect(simplify(graph.targets)).toEqual([
      { id: "__start", dependencies: [], dependents: ["a#build", "c#build", "b#build", "d#build"], priority: 15 },
      { id: "a#build", dependencies: ["__start", "b#build", "c#build"], dependents: [], priority: 5 },
      { id: "c#build", dependencies: ["__start", "d#build"], dependents: ["a#build"], priority: 8 },
      { id: "b#build", dependencies: ["__start", "d#build"], dependents: ["a#build"], priority: 7 },
      { id: "d#build", dependencies: ["__start"], dependents: ["c#build", "b#build"], priority: 15 },
    ]);
    expect([...builder.targets.values()]).toEqual(originalTargets);
    expect(simplify(builder.subgraph(["a#build", "c#build"]).targets)).toEqual(simplify(graph.targets));
  });

  it.each([{ entries: [] }, { entries: ["missing#build"] }])("returns only the start target for $entries", ({ entries }) => {
    const builder = new TargetGraphBuilder();
    builder.addTarget(createTarget("outside", "build", 1));

    expect(simplify(builder.subgraph(entries).targets)).toEqual([{ id: "__start", dependencies: [], dependents: [], priority: 0 }]);
  });

  it("still reports cycles reachable from duplicate entries", () => {
    const builder = new TargetGraphBuilder();
    builder.addTarget(createTarget("a", "build", 1));
    builder.addTarget(createTarget("b", "build", 1));
    builder.addDependency("a#build", "b#build");
    builder.addDependency("b#build", "a#build");

    expect(() => builder.subgraph(["a#build", "a#build"])).toThrow("Cycles detected in the target graph:");
  });

  it("still reports a missing dependency target", () => {
    const builder = new TargetGraphBuilder();
    builder.addTarget(createTarget("a", "build", 1));
    builder.addDependency("missing#build", "a#build");

    expect(() => builder.subgraph(["a#build"])).toThrow("Subgraph builder failed - target not found: missing#build");
  });
});

function createTarget(packageName: string, task: string, priority: number): Target {
  return {
    id: `${packageName}#${task}`,
    label: `${packageName} - ${task}`,
    task,
    packageName,
    dependencies: [],
    dependents: [],
    depSpecs: [],
    priority,
    cwd: `packages/${packageName}`,
  } as Target;
}

function simplify(targets: Map<string, Target>): any[] {
  return [...targets.entries()].map(([id, target]) => ({
    id,
    dependencies: target.dependencies,
    dependents: target.dependents,
    priority: target.priority,
  }));
}
