import { TaskLogger } from "../logger/TaskLogger";
import { Config } from "./Config";
import { TargetStatus } from "./TargetStatus";

export interface TaskArgs {
  packageName?: string;
  taskName?: string;
  options?: any;
  cwd: string;
  config: Config;
  logger: TaskLogger;
}

/** target configuration */
export interface TargetConfig {
  type?: "package" | "global";
  run?: (args: TaskArgs) => Promise<boolean> | void;
  deps?: string[];
  outputs?: string[];
  priority?: number;
  cache?: boolean;
  options?: any;
}

export interface FactoryArgs {
  cwd: string;
  config: Config;
}

export interface TargetConfigFactory {
  (args: FactoryArgs): TargetConfig | TargetConfig[];
}

/** Pipline Definition
 *
 * Example
 *
 * const p: Pipeline = {
 *   // sharded jest
 *   jest: () => {
 *     const tasks: Target[] = [];
 *
 *     for (let i = 0; i < 100; i++) {
 *       tasks.push({
 *         type: "global",
 *         task: (args) => {
 *           // run jest for a shard
 *         },
 *       });
 *     }
 *
 *     return tasks;
 *   },
 *
 *   build: {
 *     deps: ['^build']
 *   },
 *
 *   validate: {
 *     deps: []
 *   }
 * };
 */
export interface PipelineDefinition {
  [task: string]: string[] | TargetConfig | TargetConfigFactory;
}

/** individual targets to be kept track inside pipeline */
export interface PipelineTarget {
  id: string;
  packageName?: string;
  task: string;
  cwd: string;
  run?: (args: TaskArgs) => Promise<unknown> | void;
  deps?: string[];
  outputGlob?: string[];
  priority?: number;
  cache?: boolean;
  options?: any;
}

export interface LoggableTarget {
  status: TargetStatus;
  logger: TaskLogger;
  target: PipelineTarget;
  startTime: [number, number];
  duration: [number, number];
}
