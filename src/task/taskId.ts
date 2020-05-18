export function getTaskId(pkg: string, task: string) {
  return `${pkg}###${task}`;
}

export function getPackageTaskFromId(id: string) {
  return id.split("###");
}
