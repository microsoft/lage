import { TaskDepsGraph, Tasks, TaskId } from "./Task";
import { PackageInfos } from "workspace-tools";
import Profiler from "p-profiler";
import PQueue from "p-queue";
import { EventEmitter } from "events";
import { ConfigOptions, CliOptions } from "./ConfigOptions";

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

export interface RunContext extends CliOptions, ConfigOptions {
  root: string;
  taskDepsGraph: TaskDepsGraph;
  tasks: Tasks;
  allPackages: PackageInfos;
  pipeline: { [task: string]: string[] };
  measures: Measures;
  profiler: Profiler;
  taskLogs: Map<TaskId, string[]>;
  queue: PQueue;
  events: EventEmitter;
  npmCmd: string;
}
