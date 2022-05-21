import { ConfigOptions } from "./ConfigOptions";
import { CliOptions } from "./CliOptions";

interface InternalConfigOptions {
  /** calculated */
  args: any;
}

export type Config = InternalConfigOptions & ConfigOptions & CliOptions;
