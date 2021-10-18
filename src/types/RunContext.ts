import Profiler from "p-profiler";
import { WorkerQueue } from "../task/WorkerQueue";
import { LoggableTarget } from "./PipelineDefinition";

export interface Measures {
  start: [number, number];
  duration: [number, number];

  /** list of failed targets */
  failedTargets?: string[]; 
}

export interface RunContext {
  measures: Measures;
  targets: Map<string, LoggableTarget>;
  profiler: Profiler;
  workerQueue: WorkerQueue | undefined
}
