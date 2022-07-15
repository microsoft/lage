export interface Target<TRunOptions> {
  id: string;
  label: string;
  cwd: string;
  status: "pending" | "running" | "complete" | "failed";

  // Dependencies on other Targets
  dependencies?: string[];
  priority?: number;

  // Cache Options: inputs and outputs of the Target
  outputs?: string[];
  inputs?: string[];

  /** For custom run definition */
  run?: (target: Target<TRunOptions>, options: TRunOptions) => Promise<void>;
}
