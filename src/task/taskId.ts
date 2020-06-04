export function getTaskId(pkg: string, task: string) {
  return `${pkg}###${task}`;
}
