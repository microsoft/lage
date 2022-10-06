import { getPackageAndTask } from "../src/targetId";
import { Target } from "../src/types/Target";
import { prioritize } from "../src/prioritize";

function createTarget({
  packageName,
  task,
  dependencies,
  dependents,
  priority,
}: {
  packageName: string;
  task: string;
  dependencies: string[];
  dependents: string[];
  priority: number;
}): Target {
  return {
    id: `${packageName}#${task}`,
    label: `${packageName} - ${task}`,
    task,
    packageName,
    dependencies,
    dependents,
    depSpecs: [],
    priority,
    cwd: `packages/${packageName}`,
  } as Target;
}

describe("prioritize", () => {
  it("should prioritize targets", () => {
    const targets = new Map<string, Target>();
    const edges = [
      ["a#build", "b#build"],
      ["a#build", "e#build"],
      ["b#build", "c#build"],
      ["c#build", "d#build"],
      ["_start#x", "a#lint"],
      ["_start#x", "b#lint"],
      ["_start#x", "c#lint"],
      ["_start#x", "d#lint"],
      ["_start#x", "a#build"],
      ["_start#x", "b#build"],
      ["_start#x", "c#build"],
      ["_start#x", "d#build"],
      ["_start#x", "e#build"],
    ];

    for (const [from, to] of edges) {
      if (!targets.has(from)) {
        const { packageName, task } = getPackageAndTask(from);
        targets.set(from, createTarget({ packageName: packageName!, task, dependencies: [], dependents: [], priority: 1 }));
      }

      if (!targets.has(to)) {
        const { packageName, task } = getPackageAndTask(to);
        targets.set(to, createTarget({ packageName: packageName!, task, dependencies: [], dependents: [], priority: 1 }));
      }

      targets.get(from)!.dependencies.push(to);
      targets.get(to)!.dependents.push(from);
    }

    targets.get("c#build")!.priority = 10;

    prioritize(targets);

    expect([...targets.values()].map((t) => ({ id: t.id, priority: t.priority }))).toMatchInlineSnapshot(`
      [
        {
          "id": "a#build",
          "priority": 13,
        },
        {
          "id": "b#build",
          "priority": 12,
        },
        {
          "id": "e#build",
          "priority": 1,
        },
        {
          "id": "c#build",
          "priority": 11,
        },
        {
          "id": "d#build",
          "priority": 1,
        },
        {
          "id": "_start#x",
          "priority": 14,
        },
        {
          "id": "a#lint",
          "priority": 1,
        },
        {
          "id": "b#lint",
          "priority": 1,
        },
        {
          "id": "c#lint",
          "priority": 1,
        },
        {
          "id": "d#lint",
          "priority": 1,
        },
      ]
    `);
  });
});
