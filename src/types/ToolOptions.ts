export interface ToolOptions {
  pipeline: { [task: string]: string[] };
  cache: boolean;
  scopes: string[];
}
