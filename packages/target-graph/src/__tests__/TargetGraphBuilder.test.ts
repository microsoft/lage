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
