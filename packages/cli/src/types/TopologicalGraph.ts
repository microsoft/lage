export type TopologicalGraph = {
  [name: string]: {
    location: string;
    dependencies: string[];
  };
};
