export interface Priority {
  /** package name, as in package.json */
  package?: string;

  /** task name, as listed in the `scripts` section of package.json */
  task: string;

  /** priority, the higher the more priority; undefined priority means lowest priority*/
  priority: number;
}
