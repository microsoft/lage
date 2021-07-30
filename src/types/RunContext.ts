import Profiler from "p-profiler";
import { WrappedTarget } from "../task/WrappedTarget";


export interface Measures {
  start: [number, number];
  duration: [number, number];

  /** list of failed targets */
  failedTargets?: string[]; 
}

export interface RunContext {
  measures: Measures;
  targets: Map<string, WrappedTarget>;
  profiler: Profiler;
}
