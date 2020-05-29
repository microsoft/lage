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
  failedTask?: string;
  taskStats: TaskStats[];
}

export interface RunContext {
  taskLogs: Map<TaskId, string[]>;
  measures: Measures;
  profiler: Profiler;
  queue: PQueue;
  events: EventEmitter;
}
