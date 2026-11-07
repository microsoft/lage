/** A package graph edge that defines a single package name and one of its dependency */
export interface PackageDependency {
  /** Name of a package */
  name: string;
  /** A dependency of `name` */
  dependency: string;
}

/** The graph is defined by as a list of package names as nodes, and a list of dependencies as edges */
export interface PackageGraph {
  /** Nodes: list of package names */
  packages: string[];

  /** Edges: list of package dependencies */
  dependencies: PackageDependency[];
}
