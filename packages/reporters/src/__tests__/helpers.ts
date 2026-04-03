import type { TargetRun, TargetStatus } from "@lage-run/scheduler-types";
import type { Target } from "@lage-run/target-graph";

export function createTarget(packageName: string, task: string): Target {
  return {
    id: `${packageName}#${task}`,
    cwd: `/repo/root/packages/${packageName}`,
    dependencies: [],
    dependents: [],
    depSpecs: [],
    packageName,
    task,
    label: `${packageName} - ${task}`,
  };
}

export function createTargetRun(target: Target, status: TargetStatus): TargetRun<unknown> {
  return {
    target,
    status,
    duration: [60, 0],
    queueTime: [2, 0],
    startTime: [5, 0],
    threadId: 1,
  };
}
