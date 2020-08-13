export function parseDepsAndTopoDeps(taskDeps: string[]) {
  const deps = taskDeps.filter((dep) => !dep.startsWith("^"));
  const topoDeps = taskDeps
    .filter((dep) => dep.startsWith("^"))
    .map((dep) => dep.slice(1));
  return {
    deps,
    topoDeps,
  };
}
