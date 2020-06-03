import { TaskId } from "./Task";
import Profiler from "p-profiler";
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
  failedTask?: { pkg: string; task: string };
  taskStats: TaskStats[];
}

export interface RunContext {
  measures: Measures;
  profiler: Profiler;
}
