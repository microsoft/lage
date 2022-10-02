import type { Target } from "./types/Target";

/**
 * Priorities for a target is actually the MAX of all the priorities of the targets that depend on it.
 */
export function prioritize(targets: Map<string, Target>) {
  const stack: Target[] = [];

  // start with the leaves - the children of the all targets
  for (const target of targets.values()) {
    if (target.dependencies.length === 0) {
      stack.push(target);
    }
  }

  // fill every target with the max priority of its dependents
  while (stack.length > 0) {
    const currentTarget = stack.pop()!;
    const currentPriority = currentTarget.priority;

    for (const dependentId of currentTarget.dependents) {
      const dependent = targets.get(dependentId)!;
      dependent.priority = Math.max(dependent.priority ?? 0, currentPriority ?? 0);

      stack.push(dependent);
    }
  }
}
