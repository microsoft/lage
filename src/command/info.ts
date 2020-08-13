import { logger } from "../logger";
import { Config } from "../types/Config";
import { getWorkspace } from "../workspace/getWorkspace";
import { generateTopologicGraph } from "../workspace/generateTopologicalGraph";
import { generateTaskGraph } from "@microsoft/task-scheduler";
import { getPipelinePackages } from "../task/getPipelinePackages";
import { Tasks } from "@microsoft/task-scheduler/lib/types";
import { parseDepsAndTopoDeps } from "../task/parseDepsAndTopoDeps";
import { PackageTaskInfo } from "../logger/LogEntry";
import { getPackageAndTask } from "../task/taskId";
import path from "path";
import { Workspace } from "../types/Workspace";
import { getNpmCommand } from "../task/getNpmCommand";

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
  const tasks: Tasks = new Map();

  for (const [taskName, taskDeps] of Object.entries(config.pipeline)) {
    const { deps, topoDeps } = parseDepsAndTopoDeps(taskDeps);

    tasks.set(taskName, {
      name: taskName,
      run: () => Promise.resolve(true),
      deps,
      topoDeps,
    });
  }

  const graph = generateTopologicGraph(workspace);
  const packages = getPipelinePackages(workspace, config);
  const taskDeps = generateTaskGraph(
    packages,
    config.command.slice(1),
    tasks,
    graph,
    false
  );

  const packageTasks = new Map<string, PackageTaskInfo>();

  for (const [fromId, toId] of taskDeps) {
    let fromPackageTask = packageTasks.get(fromId);
    let toPackageTask = packageTasks.get(toId);

    // Try creating missing package task info
    if (!fromPackageTask) {
      fromPackageTask = createPackageTaskInfo(fromId, config, workspace);
      if (fromPackageTask) {
        packageTasks.set(fromId, fromPackageTask);
      }
    }

    if (!toPackageTask) {
      toPackageTask = createPackageTaskInfo(toId, config, workspace);
      if (toPackageTask) {
        packageTasks.set(toId, toPackageTask);
      }
    }

    // If "from" AND "to" package tasks are valid, then connect them
    if (fromPackageTask && toPackageTask) {
      toPackageTask.dependencies.push(fromId);
    }
  }

  logger.info(`info`, {
    command: config.command.slice(1),
    scope: packages,
    packageTasks: [...packageTasks.values()],
  });
}

function createPackageTaskInfo(
  taskId: string,
  config: Config,
  workspace: Workspace
) {
  const task = getPackageAndTask(taskId)!;

  const scripts = workspace.allPackages[task.package].scripts;

  if (scripts && scripts[task.task]) {
    return {
      id: taskId,
      command: getNpmCommand(config, task.task),
      dependencies: [],
      workingDirectory: path
        .relative(
          workspace.root,
          path.dirname(workspace.allPackages[task.package].packageJsonPath)
        )
        .replace(/\\/g, "/"),
      package: task.package,
      task: task.task,
    };
  }
}
