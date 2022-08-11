
/**
 * LogStructuredData for the `info` command
 */
 export interface InfoData {
  command?: string[];
  scope?: string[];
  packageTasks?: PackageTaskInfo[];
}

/**
 * Only useful for logging purposes for the `info` command
 * Use task-scheduler types for interacting with the pipelines
 */
export interface PackageTaskInfo {
  id: string;
  package?: string;
  task: string;
  command: string[];
  workingDirectory: string;
  dependencies: string[];
}
