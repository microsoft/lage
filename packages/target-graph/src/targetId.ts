/**
 * Generates a unique target id in this format: `<package-name>#<task-name>` or `//#<task-name>`
 */
export function getTargetId(pkgName: string | undefined, task: string): string {
  return `${typeof pkgName === "string" ? pkgName : ""}#${task}`;
}

/**
 * turns a target id into a package name and task name in this format: "packageName#taskName" where packageName is optional.
 *
 * If the packageName is //, that means that the task is meant to be run at the repo root level.
 */
export function getPackageAndTask(targetId: string): { packageName: string | undefined; task: string } {
  if (targetId.startsWith(STAGED_PREFIX)) {
    return { packageName: undefined, task: targetId.slice(1) };
  }

  if (targetId.includes("#")) {
    const parts = targetId.split("#");
    return {
      // `//#<task-name>` or `#<task-name>` means root by convention
      packageName: parts[0] === "" || parts[0] === "//" ? undefined : parts[0],
      task: parts[1],
    };
  }

  return { packageName: undefined, task: targetId };
}

const START_TARGET_ID = "__start";
export function getStartTargetId(): string {
  return START_TARGET_ID;
}

const STAGED_PREFIX = "Δ";
export function getStagedTargetId(task: string): string {
  return `${STAGED_PREFIX}${task}`;
}
