import { logger } from "../logger";
import { Config } from "../types/Config";
import { getWorkspace } from "../workspace/getWorkspace";
import { getPipelinePackages } from "../task/getPipelinePackages";
import { PackageTaskInfo } from "../logger/LogEntry";
import path from "path";
import { Workspace } from "../types/Workspace";
import { getNpmCommand } from "../task/getNpmCommand";
import { Pipeline } from "../task/Pipeline";
import { getPackageAndTask } from "../task/taskId";

/**
 * Generates a graph and spit it out in stdout
 *
 * Expected format:
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
 */

export async function info(cwd: string, config: Config) {
  const workspace = getWorkspace(cwd, config);
  const packages = getPipelinePackages(workspace, config);
  const pipeline = new Pipeline(workspace, config);
  const targetGraph = pipeline.generateTargetGraph();

  const packageTasks = new Map<string, PackageTaskInfo>();

  for (const [from, to] of targetGraph) {
    for (const id of [from, to]) {
      if (!packageTasks.has(id)) {
        const packageTaskInfo = createPackageTaskInfo(id, config, workspace);
        packageTasks.set(id, packageTaskInfo);
      }
    }

    packageTasks.get(to)!.dependencies.push(from);
  }

  logger.info(`info`, {
    command: config.command.slice(1),
    scope: packages,
    packageTasks: [...packageTasks.values()],
  });
}

function createPackageTaskInfo(id: string, config: Config, workspace: Workspace): PackageTaskInfo {
  const { packageName, task } = getPackageAndTask(id)!;

  if (packageName) {
    return {
      id,
      command: [config.npmClient, ...getNpmCommand(config.node, config.args, task)],
      dependencies: [],
      workingDirectory: path
        .relative(workspace.root, path.dirname(workspace.allPackages[packageName].packageJsonPath))
        .replace(/\\/g, "/"),
      package: packageName,
      task,
    };
  } else {
    return {
      id,
      command: ["echo", `"global script ${id}"`],
      dependencies: [],
      workingDirectory: ".",
      package: undefined,
      task,
    };
  }
}
