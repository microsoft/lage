export default function createEdges(file) {
  const edgeType = "smoothstep";
  const edges: any[] = [];
  var edge: any = {};

  // generating the edges
  file["dependencies"].forEach((dep) => {
    edge = {
      id: dep["dependency"] + "-" + dep["name"],
      type: edgeType,
      source: dep["dependency"],
      target: dep["name"],
    };
    edges.push(edge);
  });

  return edges;
}
