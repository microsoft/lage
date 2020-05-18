import { TaskDepsGraph, Tasks, TaskId } from "./Task";
import { PackageInfos } from "workspace-tools";
import Profiler from "@lerna/profiler";
import PQueue from "p-queue";
import { EventEmitter } from "events";

interface TaskStats {
  taskId: TaskId;
  start: [number, number];
  duration: [number, number];
  status: "failed" | "skipped" | "success" | "not started";
}

interface Measures {
  start: [number, number];
  duration: [number, number];
  failedTask?: string;
  taskStats: TaskStats[];
}

export interface RunContext {
  taskDepsGraph: TaskDepsGraph;
  tasks: Tasks;
  allPackages: PackageInfos;
  command: string;
  concurrency: number;
  scope: string[];
  deps: boolean;
  defaultPipeline: { [task: string]: string[] };
  measures: Measures;
  profiler: Profiler;
  taskLogs: Map<TaskId, string[]>;
  queue: PQueue;
  cache: boolean;
  nodeArgs: string[];
  args: any;
  events: EventEmitter;
  verbose: boolean;
  profile: boolean;
}
