import { Logger } from "@lage-run/logger";
import { getConfig, PipelineDefinition } from "@lage-run/config";
import createLogger from "@lage-run/logger";
import { initializeReporters } from "../src/commands/initializeReporters.js";
import { generatePackageTask, type InfoActionOptions } from "../src/commands/info/action.js";
import { PackageInfo, PackageInfos } from "workspace-tools";
import { createTargetGraph } from "../src/commands/run/createTargetGraph.js";
import { getFilteredPackages } from "../src/filter/getFilteredPackages.js";
import { getBinPaths } from "../src/getBinPaths.js";

describe("createTargetGraph", () => {
  const logger = new Logger();

  it("Basic graph, seperate nodes", async () => {
    const packageInfos: PackageInfos = {
      foo1: stubPackage({ name: "foo1", deps: ["foo2"] }),
      foo2: stubPackage({ name: "foo2" }),
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
      foo1: stubPackage({ name: "foo1", deps: ["foo2"] }),
      foo2: stubPackage({ name: "foo2" }),
    };

    const pipeline: PipelineDefinition = {
      build: ["^build"],
      test: ["build"],
    };

    const result = await createAndPrintPackageTasks(["build", "test"], packageInfos, pipeline, ["id", "dependencies"]);
    expect(result).toMatchSnapshot();
  });

  it("PackageJsonOverrideForTargetDeps", async () => {
    const packageInfos: PackageInfos = {
      foo1: stubPackage({ name: "foo1", deps: ["foo2"] }),
      foo2: stubPackage({ name: "foo2", fields: { lage: { test: ["build"] } } }),
    };

    const pipeline: PipelineDefinition = {
      build: ["^build"],
      test: [],
    };

    const result = await createAndPrintPackageTasks(["build", "test"], packageInfos, pipeline, ["id", "dependencies"]);
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
  const expected = filterObjects(packageTasks, ["id", "dependencies"]);
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
  };

  initializeReporters(logger, options);

  const targetGraph = await createTargetGraph({
    logger,
    root,
    dependencies: options.dependencies,
    dependents: options.dependents && !options.to, // --to is a short hand for --scope + --no-dependents
    ignore: options.ignore.concat(config.ignore),
    pipeline: config.pipeline,
    repoWideChanges: config.repoWideChanges,
    scope: (options.scope ?? []).concat(options.to ?? []), // --to is a short hand for --scope + --no-dependents
    since: options.since,
    outputs: config.cacheOptions.outputGlob,
    tasks,
    packageInfos,
  });

  const scope = getFilteredPackages({
    root,
    packageInfos,
    logger,
    includeDependencies: options.dependencies,
    includeDependents: options.dependents && !options.to, // --to is a short hand for --scope + --no-dependents
    since: options.since,
    scope: (options.scope ?? []).concat(options.to ?? []), // --to is a short hand for --scope + --no-dependents
    repoWideChanges: config.repoWideChanges,
    sinceIgnoreGlobs: options.ignore.concat(config.ignore),
  });

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
