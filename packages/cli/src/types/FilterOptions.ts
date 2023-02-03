export interface FilterOptions {
  dependencies: boolean;
  dependents: boolean;
  since: string;
  scope: string[];
  to: string[];
  ignore: string[];
  allowNoTargetRuns: boolean;
}
