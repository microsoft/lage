export default function createEdges(file) {
  const edges = [];
  var edge = {};

  // generating the edges
  if (file === undefined || file["dependencies"] ===undefined) {
    console.log("Make sure dependencies are set within the JSON object.");
  } else {
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
}
return edges;
}
