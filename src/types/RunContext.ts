import Profiler from "p-profiler";
import { DistributedNpmScriptTask } from "../task/DistributedNpmTask";
import { NpmScriptTask } from "../task/NpmScriptTask";

export interface Measures {
  start: [number, number];
  duration: [number, number];
  failedTasks?: { pkg: string; task: string }[];
}

export interface RunContext {
  measures: Measures;
  tasks: Map<string, NpmScriptTask | DistributedNpmScriptTask>;
  profiler: Profiler;
}
