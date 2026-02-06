import { getConfig, type PipelineDefinition } from "@lage-run/config";
import createLogger from "@lage-run/logger";
import type { PackageInfo, PackageInfos } from "workspace-tools";
import { generatePackageTask, type InfoActionOptions, type PackageTask } from "../commands/info/action.js";
import { initializeReporters } from "../commands/initializeReporters.js";
import { createTargetGraph } from "../commands/run/createTargetGraph.js";
import { getBinPaths } from "../getBinPaths.js";

describe("createTargetGraph", () => {
  it("Basic graph, seperate nodes", async () => {
    const packageInfos: PackageInfos = {
      foo1: stubPackage({ name: "foo1", scripts: ["build"], deps: ["foo2"] }),
      foo2: stubPackage({ name: "foo2", scripts: ["build"] }),
    };

    const pipeline: PipelineDefinition = {
      build: ["^build"],
      test: ["build"],
    };

    const result = await createAndPrintPackageTasks(["build"], packageInfos, pipeline, ["id", "dependencies"]);
    expect(result).toMatchSnapshot();
  });

  it("Basic graph, spanning tasks", async () => {
    const packageInfos: PackageInfos = {
      foo1: stubPackage({ name: "foo1", scripts: ["build"], deps: ["foo2"] }),
      foo2: stubPackage({ name: "foo2", scripts: ["build"] }),
    };

    const pipeline: PipelineDefinition = {
      build: ["^build"],
      test: ["build"],
    };

    const result = await createAndPrintPackageTasks(["build", "test"], packageInfos, pipeline, ["id", "dependencies"]);
    expect(result).toMatchSnapshot();
  });

  it("Merging Dependencies in pipeline and package.json override", async () => {
    const packageInfos: PackageInfos = {
      foo1: stubPackage({ name: "foo1", scripts: ["build"], deps: ["foo2"], fields: { lage: { build: ["foo4#build"] } } }),
      foo2: stubPackage({ name: "foo2", scripts: ["build"] }),
      foo3: stubPackage({ name: "foo3", scripts: ["build"] }),
      foo4: stubPackage({ name: "foo4", scripts: ["build"] }),
    };

    const pipeline: PipelineDefinition = {
      build: ["^build"],
      "foo1#build": ["foo3#build"],
    };

    const result = await createAndPrintPackageTasks(["build"], packageInfos, pipeline, ["id", "dependencies"]);
    expect(result).toMatchSnapshot();
  });

  it("Merging inputs and outputs in pipeline and package.json override", async () => {
    const packageInfos: PackageInfos = {
      foo1: stubPackage({
        name: "foo1",
        deps: ["foo2"],
        scripts: ["build"],
        fields: { lage: { build: { inputs: ["tsconfig.json"], outputs: ["dist/**"] } } },
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

    const result = await createAndPrintPackageTasks(["build"], packageInfos, pipeline, ["id", "dependencies", "inputs", "outputs"]);
    expect(result).toMatchSnapshot();
  });
});

async function createAndPrintPackageTasks(
  tasks: string[],
  packageInfos: PackageInfos,
  pipeline: PipelineDefinition,
  fields: string[]
): Promise<string> {
  const packageTasks = await createPackageTasks(tasks, packageInfos, pipeline);
  const expected = filterObjects(packageTasks, fields);
  return JSON.stringify(expected, null, 2);
}

function filterObjects<T extends object>(objects: T[], fields: string[]): Partial<T>[] {
  return objects.map((obj) => filterFields(obj, fields));
}

function filterFields<T extends object>(obj: T, fields: string[]): Partial<T> {
  return <Partial<T>>Object.fromEntries(Object.entries(obj).filter(([key]) => fields.includes(key)));
}

async function createPackageTasks(tasks: string[], packageInfos: PackageInfos, pipeline: PipelineDefinition): Promise<PackageTask[]> {
  const root = process.cwd();
  const config = await getConfig(root);
  config.pipeline = pipeline;
  const logger = createLogger();
  const options: InfoActionOptions = {
    logLevel: "info",
    reporter: "json",
    dependencies: false,
    dependents: false,
    since: <string>(<any>undefined),
    scope: [],
    to: [],
    cache: false,
    nodeArg: "",
    ignore: [],
    server: "",
    progress: false,
    verbose: false,
    grouped: false,
    concurrency: 1,
    optimizeGraph: false,
  };

  await initializeReporters(logger, options);

  const targetGraph = await createTargetGraph({
    logger,
    root,
    dependencies: options.dependencies,
    dependents: options.dependents && !options.to, // --to is a short hand for --scope + --no-dependents
    enableTargetConfigMerging: true,
    ignore: options.ignore.concat(config.ignore),
    pipeline: config.pipeline,
    repoWideChanges: config.repoWideChanges,
    scope: (options.scope ?? []).concat(options.to ?? []), // --to is a short hand for --scope + --no-dependents
    since: options.since,
    outputs: config.cacheOptions.outputGlob,
    tasks,
    packageInfos,
    priorities: config.priorities,
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
  const packageTasks = targets.map((target) => generatePackageTask(target, [], config, options, binPaths, packageInfos, tasks));

  return packageTasks;
}

function stubPackage(args: { name: string; deps?: string[]; scripts?: string[]; fields?: object }): PackageInfo {
  return {
    name: args.name,
    packageJsonPath: `packages/${args.name}`,
    version: "1.0",
    dependencies: (args.deps || []).reduce((depMap, dep) => ({ ...depMap, [dep]: "*" }), {}),
    devDependencies: {},
    scripts: (args.scripts || []).reduce((scriptMap, script) => ({ ...scriptMap, [script]: `echo ${script}` }), {}),
    ...(args.fields || {}),
  } as PackageInfo;
}
