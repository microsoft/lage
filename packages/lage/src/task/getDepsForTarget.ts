export function getDepsForTarget(id: string, dependencies: [string, string][]) {
  const stack = [id];
  const deps = new Set<string>();
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (current !== id) {
      deps.add(current);
    }

    dependencies.forEach(([from, to]) => {
      if (to === current) {
        stack.push(from);
      }
    });
  }

  return [...deps];
}
