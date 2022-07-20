export interface Target {
  // state of the target
  status: "pending" | "running" | "complete" | "failed";

  id: string;
  label: string;
  cwd: string;
  task: string;

  // Package name if the target is a package target
  packageName?: string;

  // Dependencies on other Targets
  dependencies: string[];
  priority?: number;

  // Cache Options: inputs and outputs of the Target
  outputs?: string[];
  inputs?: string[];
  cache?: boolean;

  // Run options for the Target
  options?: Record<string, any>;

  /** For custom run definition */
  run?: <TRunOptions>(root: string, target: Target, options: TRunOptions) => Promise<void> | void;
}
