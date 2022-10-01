import { Target } from "./types/Target";

/**
 * Checks for any cycles in the dependency graph, returning `{ hasCycle: false }` if no cycles were detected.
 * Otherwise it returns the chain of nodes where the cycle was detected.
 */
export function detectCycles(targets: Map<string, Target>) {
  /**
   *  A map to keep track of the visited and visiting nodes.
   * <node, true> entry means it is currently being visited.
   * <node, false> entry means it's sub graph has been visited and is a DAG.
   * No entry means the node has not been visited yet.
   */
  const visitMap = new Map<string, boolean>();

  for (const [nodeId] of targets.entries()) {
    /**
     * Test whether this node has already been visited or not.
     */
    if (!visitMap.has(nodeId)) {
      /**
       * Test whether the sub-graph of this node has cycles.
       */
      const cycle = searchForCycleDFS(targets, visitMap, nodeId);
      if (cycle.length > 0) {
        return { hasCycle: true, cycle };
      }
    }
  }

  return { hasCycle: false };
}

/**
 * Stack element represents an item on the
 * stack used for depth-first search
 */
interface StackElement {
  /**
   * The node name
   */
  node: string;

  /**
   * This represents if this instance of the
   * node on the stack is being traversed or not
   */
  traversing: boolean;
}

const searchForCycleDFS = (graph: Map<string, Target>, visitMap: Map<string, boolean>, nodeId: string): string[] => {
  const stack: StackElement[] = [{ node: nodeId, traversing: false }];
  while (stack.length > 0) {
    const current = stack[stack.length - 1];

    console.log(current.node)

    if (!current.traversing) {
      if (visitMap.has(current.node)) {
        if (visitMap.get(current.node)) {
          /**
           * The current node has already been visited,
           * hence there is a cycle.
           */
          const listOfCycle = stack.filter((i) => i.traversing).map((a) => a.node);
          return listOfCycle.slice(listOfCycle.indexOf(current.node));
        } else {
          /**
           * The current node has already been fully traversed
           */
          stack.pop();
          continue;
        }
      }

      /**
       * The current node is starting its traversal
       */
      visitMap.set(current.node, true);
      stack[stack.length - 1] = { ...current, traversing: true };

      /**
       * Get the current node in the graph
       */
      const node = graph.get(current.node);
      if (!node) {
        throw new Error(`Could not find node "${current.node}" in the graph`);
      }

      /**
       * Add the current node's dependents to the stack
       */
      stack.push(...[...node.dependents].map((n) => ({ node: n, traversing: false })));
    } else {
      /**
       * The current node has now been fully traversed.
       */
      visitMap.set(current.node, false);
      stack.pop();
    }
  }
  return [];
};
