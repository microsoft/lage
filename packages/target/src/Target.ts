import { ChildProcess } from "child_process";

export interface Target {
  id: string;
  label: string;
  cwd: string;
  status: "pending" | "running" | "complete" | "failed";

  // @deprecated
  deps?: string[];

  // Dependencies on other Targets
  dependencies?: string[];

  // Inputs and outputs of the Target - for caching
  outputs?: string[];
  inputs?: string[];

  // Options for the Target - different for each kind of target
  package?: string;
  script?: string;
  cmd?: string;
  color?: boolean;
  args?: string[];
  env?: Record<string, string | undefined>;

  /** For custom run definition */
  run?: (target: Target) => Promise<void>;
}
