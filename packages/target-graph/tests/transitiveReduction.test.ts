import { TargetGraphBuilder } from "../src/TargetGraphBuilder";
import { Target } from "../src/types/Target";
import { transitiveReduction } from "../src/transitiveReduction";
import { diff } from "jest-diff";

describe("transitiveReduction", () => {
  it("should reduce the graph transitively", () => {
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
    builder.addDependency(target2.id, target3.id);
    builder.addDependency(target4.id, target1.id);

    // Graph to build
    // _start --> d#build --> a#build --> b#build --> c#build

    const targetGraph = builder.subgraph(["c#build"]);

    const targets = [...targetGraph.targets.values()];

    expect(
      diff(simplify(targets), simplify(transitiveReduction(targets)), { aAnnotation: "Original", bAnnotation: "Transitively Reduced" })
    ).toMatchInlineSnapshot(`
      "- Original
      + Transitively Reduced

        Array [
          Object {
            "dependencies": Array [],
            "dependents": Array [
              "c#build",
              "a#build",
              "b#build",
              "d#build",
            ],
            "id": "__start",
            "priority": 4,
          },
          Object {
            "dependencies": Array [
      -       "__start",
      -       "a#build",
              "b#build",
            ],
            "dependents": Array [],
            "id": "c#build",
            "priority": 1,
          },
          Object {
            "dependencies": Array [
      -       "__start",
              "d#build",
            ],
            "dependents": Array [
              "c#build",
              "b#build",
            ],
            "id": "a#build",
            "priority": 3,
          },
          Object {
            "dependencies": Array [
      -       "__start",
              "a#build",
            ],
            "dependents": Array [
              "c#build",
            ],
            "id": "b#build",
            "priority": 2,
          },
          Object {
            "dependencies": Array [
              "__start",
            ],
            "dependents": Array [
              "a#build",
            ],
            "id": "d#build",
            "priority": 4,
          },
        ]"
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

function simplify(targets: Target[]): any[] {
  return targets.map((target) => ({
    id: target.id,
    dependencies: target.dependencies,
    dependents: target.dependents,
    priority: target.priority,
  }));
}
