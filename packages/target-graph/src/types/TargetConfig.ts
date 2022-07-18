import type { Target } from "../../lib";

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

  run?: (target: Target) => Promise<boolean> | void;
}
