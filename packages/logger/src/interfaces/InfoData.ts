import type { PackageTaskInfo } from "./PackageTaskInfo";

/**
 * LogStructuredData for the `info` command
 */
export interface InfoData {
  command?: string[];
  scope?: string[];
  packageTasks?: PackageTaskInfo[];
}
