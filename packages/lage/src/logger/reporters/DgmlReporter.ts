import xmldom from "@xmldom/xmldom";
import { Reporter } from "./Reporter";
import { InfoData, LogEntry } from "../LogEntry";
import { LogLevel } from "../LogLevel";

export class DgmlReporter implements Reporter {
  constructor() {}

  log(entry: LogEntry) {
    if (entry.msg == "info" && entry.level == LogLevel.info && entry.data) {
      const packageTasks = (entry.data as InfoData).packageTasks;
      if (packageTasks) {
        const dgmlDoc = new xmldom.DOMImplementation().createDocument("http://schemas.microsoft.com/vs/2009/dgml", "DirectedGraph");
        const directedGraph = dgmlDoc.documentElement!;
        directedGraph.setAttribute("GraphDirection", "LeftToRight");

        const nodes = dgmlDoc.createElement("Nodes");
        const links = dgmlDoc.createElement("Links");
        const categories = dgmlDoc.createElement("Categories");
        directedGraph.appendChild(nodes);
        directedGraph.appendChild(links);
        directedGraph.appendChild(categories);

        const visitedCategories = new Set<string>();

        for (const packageTask of packageTasks) {
          // Node
          const node = dgmlDoc.createElement("Node");
          node.setAttribute("Id", packageTask.id);
          node.setAttribute("Label", packageTask.id);
          nodes.appendChild(node);

          const category = dgmlDoc.createElement("Category");
          category.setAttribute("Ref", packageTask.task);
          node.appendChild(category);

          // Links
          for (const dependencyId of packageTask.dependencies) {
            const link = dgmlDoc.createElement("Link");
            link.setAttribute("Source", packageTask.id);
            link.setAttribute("Target", dependencyId);
            links.appendChild(link);
          }

          // Category
          if (!visitedCategories.has(packageTask.task)) {
            visitedCategories.add(packageTask.task);
            const category = dgmlDoc.createElement("Category");
            category.setAttribute("Id", packageTask.task);
            category.setAttribute("Label", packageTask.task);
            categories.appendChild(category);
          }
        }

        const dgmlContents = new xmldom.XMLSerializer().serializeToString(dgmlDoc);
        // eslint-disable-next-line no-console
        console.log(dgmlContents);
      }
    }
  }

  summarize() {}
}
