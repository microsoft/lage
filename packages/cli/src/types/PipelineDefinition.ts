import { TargetConfig } from "@lage-run/target-graph";
import { ConfigOptions } from "./ConfigOptions";

export interface FactoryArgs {
  cwd: string;
  config: ConfigOptions;
}

export interface TargetConfigFactory {
  (args: FactoryArgs): TargetConfig | TargetConfig[];
}

export interface PipelineDefinition {
  [task: string]: string[] | TargetConfig;
}
