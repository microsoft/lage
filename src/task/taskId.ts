const DELIMITER = "###";

export function getTaskId(pkg: string, task: string) {
  return `${pkg}${DELIMITER}${task}`;
}

export function getPackageAndTask(taskId: string) {
  const items = taskId.split(DELIMITER);

  if (items.length === 2) {
    return {
      package: items[0],
      task: items[1],
    };
  } else {
    return undefined;
  }
}
