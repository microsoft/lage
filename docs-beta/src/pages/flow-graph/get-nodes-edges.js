const position = { x: 0, y: 0 };
const edgeType = "smoothstep";

export function createNodes(file) {
  const nodes = [];
  var node = {};
  const names = new Set();
  const dependencies = new Set();

  file["dependencies"].forEach((dep) => {
    names.add(dep["name"]);
    dependencies.add(dep["dependency"]);
  });

  // generating the nodes
  file["packages"].forEach((pkg) => {
    var isOutput = names.has(pkg) && !dependencies.has(pkg);
    var isInput = dependencies.has(pkg) && !names.has(pkg);
    var isIndependent = !names.has(pkg) && !dependencies.has(pkg);
    node = {
      id: pkg,
      type: isIndependent
        ? "independentNode"
        : isOutput
        ? "output"
        : isInput
        ? "input"
        : "default",
      data: {
        label: pkg,
      },
      position: position,
      style: {
        background: (isIndependent ? "#90D4A1" : (isInput ? "#A7E2E8" : (isOutput ? "#F2B4FF" : "#fff"))),
        color: "#000",
        border: "1px solid #222138",
        width: 180,
      },
    };
    nodes.push(node);
  });
  return nodes;
}

export function createEdges(file) {
  const edges = [];
  var edge = {};

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

