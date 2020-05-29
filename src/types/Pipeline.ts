export interface Pipeline {
  [task: string]: string[];
}

export type Pipelines = Map<string, Pipeline>;
