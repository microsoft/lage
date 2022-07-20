export function getTargetId(pkgName: string | undefined, task: string) {
  return `${typeof pkgName === 'string' ? pkgName : '' }#${task}`;
}

/**
 * turns a target id into a package name and task name in this format: "packageName#taskName" where packageName is optional.
 * 
 * If the packageName is //, that means that the task is meant to be run at the repo root level.
 * 
 * @param targetId 
 * @returns 
 */
export function getPackageAndTask(targetId: string) {
  if (targetId.includes("#")) {
    const parts = targetId.split("#");

    // "//" means root
    if (targetId.startsWith('#') || parts[0] === "//") { 
      return { packageName: undefined, task: parts[1] }
    }

    return { packageName: parts[0], task: parts[1] };
  } else {
    return { packageName: undefined, task: targetId };
  }
}
