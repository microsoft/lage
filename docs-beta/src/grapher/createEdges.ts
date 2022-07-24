export default function createEdges(file) {
  const edges = [];
  var edge = {};

  // generating the edges
  file["dependencies"].forEach((dep) => {
    edge = {
      id: dep["dependency"] + "-" + dep["name"],
      type: "default",
      source: dep["dependency"],
      target: dep["name"],
      markerEnd: {
        type: "arrowclosed",
        color: "purple",
      },
      animated: true,
    };
    edges.push(edge);
  });
  return edges;
}
