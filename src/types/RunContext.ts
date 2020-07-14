import Profiler from "p-profiler";

interface TaskStats {
  pkg: string;
  task: string;
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
