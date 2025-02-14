import { getConfig } from "@lage-run/config";
import { TargetFactory } from "@lage-run/target-graph";
import path from "path";
import fs from "fs";
import { getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import { filterArgsForTasks } from "../run/filterArgsForTasks.js";
import { expandTargetDefinition } from "./expandTargetDefinition.js";
import { TargetRunnerPicker } from "@lage-run/runners";
import { type Logger } from "@lage-run/logger";
import { runnerPickerOptions } from "../../runnerPickerOptions.js";

interface ExecuteInProcessOptions {
  cwd?: string;
  nodeArg?: string;
  args?: string[];
  logger: Logger;
}

/**
 * Parses the package and task from the command as quickly as possible:
 *
 * 1. if cwd overridden in args, use it to read the package.json directly
 * 2. if cwd not overridden and root is not cwd, use the cwd to read the package.json directly
 * 3. if root is cwd, assume the task is global
 *
 * @param options
 * @param command
 * @returns
 */
function parsePackageInfoFromArgs(root: string, cwd: string | undefined, packageName: string | undefined, task: string) {
  if (packageName && task) {
    const packageInfos = getPackageInfos(root);
    const info = packageInfos[packageName];
    return {
      info,
      task,
      isGlobal: false,
    };
  }

  if (cwd) {
    const packageJsonPath = path.join(cwd, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    return {
      info: {
        ...packageJson,
        packageJsonPath,
      },
      task,
      isGlobal: false,
    };
  }

  if (root !== process.cwd()) {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      return {
        info: {
          ...packageJson,
          packageJsonPath,
        },
        task,
        isGlobal: false,
      };
    }
  }

  const packageJsonPath = path.join(root, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

  return {
    info: {
      ...packageJson,
      packageJsonPath,
    },
    task,
    isGlobal: true,
  };
}

export async function executeInProcess({ cwd, args, nodeArg, logger }: ExecuteInProcessOptions) {
  const root = getWorkspaceRoot(process.cwd())!;
  const config = await getConfig(root);
  const { pipeline } = config;

  const taskArg = args?.length === 1 ? args?.[0] : args?.[1];
  const packageName = args?.length ?? 0 > 1 ? args?.[0] : undefined;

  if (!taskArg) {
    throw new Error("No task provided");
  }

  const { info, task, isGlobal } = parsePackageInfoFromArgs(root, cwd, packageName, taskArg);

  const packageInfos = { [info.name]: info };

  const resolve = () => {
    return path.dirname(info.packageJsonPath).replace(/\\/g, "/");
  };

  const { taskArgs } = filterArgsForTasks(args ?? []);

  const factory = new TargetFactory({ root, resolve, packageInfos });

  const definition = expandTargetDefinition(isGlobal ? undefined : info.name, task, pipeline, config.cacheOptions.outputGlob ?? []);

  const target = isGlobal ? factory.createGlobalTarget(task, definition) : factory.createPackageTarget(info.name, task, definition);
  const pickerOptions = runnerPickerOptions(nodeArg, config.npmClient, taskArgs);

  const runnerPicker = new TargetRunnerPicker(pickerOptions);
  const runner = await runnerPicker.pick(target);

  if (await runner.shouldRun(target)) {
    logger.info("Running target", { target });

    try {
      await runner.run({
        target,
        weight: 1,
        abortSignal: new AbortController().signal,
      });

      logger.info("Finished", { target });
    } catch (result) {
      process.exitCode = 1;

      if (typeof result === "object" && result !== null && "exitCode" in result) {
        if (typeof result.exitCode === "number" && result.exitCode !== 0) {
          process.exitCode = result.exitCode;
        }
      }

      if (typeof result === "object" && result !== null && "error" in result) {
        logger.error(`Failed`, { target, error: result.error });
        return;
      }

      logger.error(`Failed`, { target, error: result });
    }
  }
}
