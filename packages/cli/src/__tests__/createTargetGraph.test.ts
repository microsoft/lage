import { describe, expect, it } from "@jest/globals";
import type { PipelineDefinition } from "@lage-run/config";
import createLogger from "@lage-run/logger";
import path from "path";
import type { PackageInfo, PackageInfos } from "workspace-tools";
import { generatePackageTask, type PackageTask } from "../commands/info/action.js";
import { createTargetGraph } from "../commands/run/createTargetGraph.js";
import { getBinPaths } from "../getBinPaths.js";

describe("createTargetGraph", () => {
  it("creates basic graph with separate nodes", async () => {
    const packageInfos: PackageInfos = {
      foo1: stubPackage({ name: "foo1", scripts: ["build"], deps: ["foo2"] }),
      foo2: stubPackage({ name: "foo2", scripts: ["build"] }),
    };

    const pipeline: PipelineDefinition = {
      build: ["^build"],
      test: ["build"],
    };

    const result = await createPackageTasks(["build"], packageInfos, pipeline, ["id", "dependencies"]);
    expect(result).toEqual([
      { id: "__start", dependencies: [] },
      { id: "foo1#build", dependencies: ["__start", "foo2#build"] },
      { id: "foo2#build", dependencies: ["__start"] },
    ]);
  });

  it("creates basic graph spanning tasks", async () => {
    const packageInfos: PackageInfos = {
      foo1: stubPackage({ name: "foo1", scripts: ["build"], deps: ["foo2"] }),
      foo2: stubPackage({ name: "foo2", scripts: ["build"] }),
    };

    const pipeline: PipelineDefinition = {
      build: ["^build"],
      test: ["build"],
    };

    const result = await createPackageTasks(["build", "test"], packageInfos, pipeline, ["id", "dependencies"]);
    expect(result).toEqual([
      { id: "__start", dependencies: [] },
      { id: "foo1#build", dependencies: ["__start", "foo2#build"] },
      { id: "foo2#build", dependencies: ["__start"] },
      { id: "foo1#test", dependencies: ["__start", "foo1#build"] },
      { id: "foo2#test", dependencies: ["__start", "foo2#build"] },
    ]);
  });

  it("merges dependencies in pipeline with package.json override", async () => {
    const packageInfos: PackageInfos = {
      foo1: stubPackage({ name: "foo1", scripts: ["build"], deps: ["foo2"], extra: { lage: { build: ["foo4#build"] } } }),
      foo2: stubPackage({ name: "foo2", scripts: ["build"] }),
      foo3: stubPackage({ name: "foo3", scripts: ["build"] }),
      foo4: stubPackage({ name: "foo4", scripts: ["build"] }),
    };

    const pipeline: PipelineDefinition = {
      build: ["^build"],
      "foo1#build": ["foo3#build"],
    };

    const result = await createPackageTasks(["build"], packageInfos, pipeline, ["id", "dependencies"]);
    expect(result).toEqual([
      { id: "__start", dependencies: [] },
      { id: "foo1#build", dependencies: ["__start", "foo2#build", "foo3#build", "foo4#build"] },
      { id: "foo2#build", dependencies: ["__start"] },
      { id: "foo3#build", dependencies: ["__start"] },
      { id: "foo4#build", dependencies: ["__start"] },
    ]);
  });

  it("merges inputs and outputs in pipeline with package.json override", async () => {
    const packageInfos: PackageInfos = {
      foo1: stubPackage({
        name: "foo1",
        deps: ["foo2"],
        scripts: ["build"],
        extra: { lage: { build: { inputs: ["tsconfig.json"], outputs: ["dist/**"] } } },
      }),
      foo2: stubPackage({ name: "foo2", scripts: ["build"] }),
    };

    const pipeline: PipelineDefinition = {
      build: { inputs: ["src/**"], outputs: ["lib/**"] },
      "foo1#build": {
        inputs: ["src/**", "myTool.config"],
        dependsOn: ["foo2#build"],
      },
    };

    const result = await createPackageTasks(["build"], packageInfos, pipeline, ["id", "dependencies", "inputs", "outputs"]);
    expect(result).toEqual([
      {
        id: "__start",
        dependencies: [],
      },
      {
        id: "foo1#build",
        dependencies: ["__start", "foo2#build"],
        inputs: ["src/**", "src/**", "myTool.config", "tsconfig.json"],
        outputs: ["lib/**", "dist/**"],
      },
      {
        id: "foo2#build",
        dependencies: ["__start"],
        inputs: ["src/**"],
        outputs: ["lib/**"],
      },
    ]);
  });
});

const ROOT = path.resolve("/fake/root");

/**
 * Create package tasks and filter the fields for snapshot testing.
 */
async function createPackageTasks(
  tasks: string[],
  packageInfos: PackageInfos,
  pipeline: PipelineDefinition,
  fields: (keyof PackageTask)[]
) {
  const logger = createLogger();

  const targetGraph = await createTargetGraph({
    logger,
    root: ROOT,
    dependencies: false,
    dependents: false,
    enableTargetConfigMerging: true,
    enablePhantomTargetOptimization: false,
    ignore: [],
    pipeline,
    repoWideChanges: [],
    scope: [],
    since: undefined,
    outputs: [],
    tasks,
    packageInfos,
    priorities: [],
  });

  // unused?
  // const scope = getFilteredPackages({
  //   root,
  //   packageInfos,
  //   logger,
  //   includeDependencies: options.dependencies,
  //   includeDependents: options.dependents && !options.to, // --to is a short hand for --scope + --no-dependents
  //   since: options.since,
  //   scope: (options.scope ?? []).concat(options.to ?? []), // --to is a short hand for --scope + --no-dependents
  //   repoWideChanges: config.repoWideChanges,
  //   sinceIgnoreGlobs: options.ignore.concat(config.ignore),
  // });

  const binPaths = getBinPaths();
  const targets = [...targetGraph.targets.values()];
  const packageTasks = targets.map((target) =>
    generatePackageTask(target, [], { npmClient: "yarn" }, { concurrency: 1, server: "" }, binPaths, packageInfos, tasks)
  );

  return packageTasks.map((obj) => Object.fromEntries(Object.entries(obj).filter(([key]) => fields.includes(key as keyof PackageTask))));
}

function stubPackage(args: { name: string; deps?: string[]; scripts?: string[]; extra?: object }): PackageInfo {
  return {
    name: args.name,
    packageJsonPath: path.join(ROOT, "packages", args.name),
    version: "1.0.0",
    dependencies: (args.deps || []).reduce((depMap, dep) => ({ ...depMap, [dep]: "*" }), {}),
    devDependencies: {},
    scripts: (args.scripts || []).reduce((scriptMap, script) => ({ ...scriptMap, [script]: `echo ${script}` }), {}),
    ...args.extra,
  } as PackageInfo;
}
