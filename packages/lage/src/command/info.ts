import { logger } from "../logger";
import { Config } from "../types/Config";
import { getWorkspace } from "../workspace/getWorkspace";
import { getPipelinePackages } from "../task/getPipelinePackages";
import { PackageTaskInfo } from "../logger/LogEntry";
import path from "path";
import { Workspace } from "../types/Workspace";
import { getNpmCommand } from "../task/getNpmCommand";
import { Pipeline, START_TARGET_ID } from "../task/Pipeline";
import { getPackageAndTask } from "../task/taskId";

/**
 * Generates a graph and spit it out in stdout
 *
 * Expected format:
 * ```json
 * [
 *   {
 *       "id": "bar##build",
 *       "package": "bar",
 *       "task": "build",
 *       "command": "npm run build --blah",
 *       "workingDirectory": "packages/bar",
 *       "dependencies": []
 *   },
 *   {
 *       "id": "foo##build",
 *       "package": "foo",
 *       "task": "build",
 *       "command": "npm run build --blah",
 *       "workingDirectory": "packages/foo",
 *       "dependencies": [
 *           "bar##build"
 *       ]
 *   },
 *   {
 *       "id": "foo##test",
 *       "package": "foo",
 *       "task": "test",
 *       "command": "npm run test --blah",
 *       "workingDirectory": "packages/foo",
 *       "dependencies": [
 *           "foo##build"
 *       ]
 *   },
 *   ...
 * ]
 * ```
 */
export async function info(cwd: string, config: Config) {
  const workspace = getWorkspace(cwd, config);
  const packages = getPipelinePackages(workspace, config);
  const pipeline = new Pipeline(workspace, config);
  const targetGraph = pipeline.generateTargetGraph();

  const dependenciesCache = new Map<string, string>();
  const packageTasks = new Map<string, PackageTaskInfo>();

  for (const [from, to] of targetGraph) {
    for (const id of [from, to]) {
      if (!packageTasks.has(id)) {
        const packageTaskInfo = createPackageTaskInfo(id, config, workspace);

        if (packageTaskInfo && id !== START_TARGET_ID) {
          packageTasks.set(id, packageTaskInfo);
        }
      }
    }

    if (packageTasks.has(to) && from !== START_TARGET_ID) {
      packageTasks.get(to)!.dependencies.push(from);
    }
  }

  for (const [, info] of packageTasks) {
    info.dependencies = info.dependencies.flatMap((dependency: string) => resolveDependency(dependency, packageTasks, dependenciesCache));
  }

  logger.info(`info`, {
    command: config.command.slice(1),
    scope: packages,
    packageTasks: [...packageTasks.values()].filter((task) => task.type === "npm-script"),
  });
}

function resolveDependency(
  dependency: string,
  packageTasks: Map<string, PackageTaskInfo>,
  dependenciesCache: Map<string, string>
): string | string[] {
  if (dependenciesCache[dependency]) {
    return dependenciesCache[dependency];
  }

  const dependencyTarget = packageTasks.get(dependency)!;
  if (dependencyTarget.type === "npm-script") {
    dependenciesCache[dependency] = dependency;
  } else if (dependencyTarget.type === "noop") {
    dependenciesCache[dependency] = [
      ...new Set(
        dependencyTarget.dependencies.flatMap((dependency: string) => resolveDependency(dependency, packageTasks, dependenciesCache))
      ),
    ];
  }

  return dependenciesCache[dependency];
}

function createPackageTaskInfo(id: string, config: Config, workspace: Workspace): PackageTaskInfo | undefined {
  const { packageName, task } = getPackageAndTask(id)!;

  if (packageName) {
    const info = workspace.allPackages[packageName];

    return {
      id,
      command: [config.npmClient, ...getNpmCommand(config.node, config.args, task)],
      dependencies: [],
      workingDirectory: path.relative(workspace.root, path.dirname(workspace.allPackages[packageName].packageJsonPath)).replace(/\\/g, "/"),
      package: packageName,
      task,
      type: info.scripts?.[task] ? "npm-script" : "noop",
    };
  } else {
    return {
      id,
      command: ["echo", `"global script ${id}"`],
      dependencies: [],
      workingDirectory: ".",
      package: undefined,
      task,
      type: "npm-script",
    };
  }
}
