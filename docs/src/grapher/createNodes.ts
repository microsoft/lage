export default function createNodes(file) {
  const position = { x: 0, y: 0 };
  const nodes: any[] = [];
  var node: any = {};
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
      type: isIndependent ? "independentNode" : isOutput ? "output" : isInput ? "input" : "default",
      data: {
        label: pkg,
      },
      position: position,
      style: {
        background: isIndependent ? "#90D4A1" : isInput ? "#A7E2E8" : isOutput ? "#F2B4FF" : "#fff",
        color: "#000",
        border: "1px solid #222138",
        width: 180,
      },
    };
    nodes.push(node);
  });
  return nodes;
}
