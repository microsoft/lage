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
    priority: 1,
    cwd: `packages/${packageName}`,
  } as Target;
}

describe("prioritize", () => {
  it("should prioritize targets", () => {
    const targets = new Map<string, Target>();
    const edges = [
      ["a#build", "b#build"],
      ["b#build", "c#build"],
      ["c#build", "d#build"],
      ["_start", "a#lint"],
      ["_start", "b#lint"],
      ["_start", "c#lint"],
      ["_start", "d#lint"],
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
          "priority": 10,
        },
        {
          "id": "b#build",
          "priority": 10,
        },
        {
          "id": "c#build",
          "priority": 10,
        },
        {
          "id": "d#build",
          "priority": 1,
        },
        {
          "id": "undefined#_start",
          "priority": 1,
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

    expect(targets.get("a#build")?.priority).toEqual(10);
    expect(targets.get("b#build")?.priority).toEqual(10);
    expect(targets.get("c#build")?.priority).toEqual(10);
    expect(targets.get("d#build")?.priority).toEqual(1);
    expect(targets.get("a#lint")?.priority).toEqual(1);
    expect(targets.get("b#lint")?.priority).toEqual(1);
    expect(targets.get("c#lint")?.priority).toEqual(1);
  });
});
