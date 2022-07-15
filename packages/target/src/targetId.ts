export function getTargetId(pkgName: string | undefined, task: string) {
  return `${pkgName}#${task}`;
}

export function getPackageAndTask(targetId: string) {
  if (targetId.includes("#")) {
    const parts = targetId.split("#");
    return { packageName: parts[0], task: parts[1] };
  } else {
    return { packageName: undefined, task: targetId };
  }
}
