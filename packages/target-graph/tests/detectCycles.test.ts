import type { Target } from "../src/types/Target";
import { detectCycles } from "../src/detectCycles";
import { getPackageAndTask } from "../src/targetId";

function createTarget({
  packageName,
  task,
  dependencies,
  dependents,
}: {
  packageName: string;
  task: string;
  dependencies: string[];
  dependents: string[];
}): Target {
  return {
    id: `${packageName}#${task}`,
    label: `${packageName} - ${task}`,
    task,
    packageName,
    dependencies,
    dependents,
    depSpecs: [],
    cwd: `packages/${packageName}`,
  } as Target;
}

describe("detectCycles", () => {
  it("should detect cycles", () => {
    const targets = new Map<string, Target>();
    const edges = [
      ["a#build", "b#build"],
      ["b#build", "c#build"],
      ["c#build", "d#build"],
      ["d#build", "a#build"],
      ["_start", "a#lint"],
      ["_start", "b#lint"],
      ["_start", "c#lint"],
      ["_start", "d#lint"],
    ];

    for (const [from, to] of edges) {
      if (!targets.has(from)) {
        const { packageName, task } = getPackageAndTask(from);
        targets.set(
          from,
          createTarget({
            packageName: packageName!,
            task,
            dependencies: [],
            dependents: [],
          })
        );
      }

      if (!targets.has(to)) {
        const { packageName, task } = getPackageAndTask(to);
        targets.set(
          to,
          createTarget({
            packageName: packageName!,
            task,
            dependencies: [],
            dependents: [],
          })
        );
      }

      targets.get(from)!.dependencies.push(to);
      targets.get(to)!.dependents.push(from);
    }

    expect(detectCycles(targets)).toMatchInlineSnapshot(`
      {
        "cycle": [
          "a#build",
          "d#build",
          "c#build",
          "b#build",
        ],
        "hasCycle": true,
      }
    `);
  });

  it("should skip non-cycles", () => {
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
        targets.set(
          from,
          createTarget({
            packageName: packageName!,
            task,
            dependencies: [],
            dependents: [],
          })
        );
      }

      if (!targets.has(to)) {
        const { packageName, task } = getPackageAndTask(to);
        targets.set(
          to,
          createTarget({
            packageName: packageName!,
            task,
            dependencies: [],
            dependents: [],
          })
        );
      }

      targets.get(from)!.dependencies.push(to);
      targets.get(to)!.dependents.push(from);
    }

    expect(detectCycles(targets)).toMatchInlineSnapshot(`
      {
        "hasCycle": false,
      }
    `);
  });
});
