/**
 * Built-in `Target/TargetConfig.type` values and runner types.
 *
 * (In theory `target-graph` is generic and not tied to these types, but they're used by
 * `WorkspaceTargetGraphBuilder` in this package.)
 */
export const builtInTargetTypes = {
  npmScript: "npmScript",
  noop: "noop",
  worker: "worker",
} as const;
