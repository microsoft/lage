import type { Target } from "./Target";

/** target configuration */
export interface TargetConfig {
  type?: "package" | "global";

  /** @deprecated */
  deps?: string[];
  dependsOn?: string[];

  inputs?: string[];
  outputs?: string[];
  priority?: number;
  cache?: boolean;
  options?: Record<string, any>;

  run?: (target: Target) => Promise<void> | void;
}
