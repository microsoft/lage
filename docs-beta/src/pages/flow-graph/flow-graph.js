import { createNodes } from "./get-nodes-edges";
import { createEdges } from "./get-nodes-edges";
import React, { useCallback } from "react";
import ReactFlow, {
  addEdge,
  ConnectionLineType,
  useNodesState,
  useEdgesState,
  MiniMap,
  Controls,
  Background
} from "react-flow-renderer";
import dagre from "dagre";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import independentNode from "./independent-node";

export const FlowGraph = (props) => {
  const json = JSON.parse(props.children);
  const nodes = createNodes(json);
  const edges = createEdges(json);
  console.log(nodes);
  console.log(edges);
  const initialNodes = nodes;
  const initialEdges = edges;
  const { siteConfig } = useDocusaurusContext();
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  const nodeWidth = 172;
  const nodeHeight = 36;
  const nodeTypes = {
    independentNode: independentNode,
  };
  const getLayoutedElements = (nodes, edges, direction = "TB") => {
    const isHorizontal = direction === "LR";
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      node.targetPosition = isHorizontal ? "left" : "top";
      node.sourcePosition = isHorizontal ? "right" : "bottom";

      node.position = {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      };

      return node;
    });

    return { nodes, edges };
  };

  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    initialNodes,
    initialEdges
  );

  const nodeColor = (node) => {
    switch (node.type) {
      case 'input':
        return '#A7E2E8';
      case 'independentNode':
        return '#90D4A1';
      case 'output':
        return '#F2B4FF';
      default:
        return '#FFFFFF';
    }
  };


  const LayoutFlow = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

    const onConnect = useCallback(
      (params) =>
        setEdges((eds) =>
          addEdge(
            { ...params, type: ConnectionLineType.SmoothStep, animated: true },
            eds
          )
        ),
      []
    );

    return (
      <div className="bg-bodyPrimary">
        <ReactFlow
          style={{ width: "60rem", height: "40rem"}}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
        >
      <MiniMap nodeColor={nodeColor} nodeStrokeWidth={3} />
      <Controls />
      <Background/>
        </ReactFlow>
      </div>
    );
  };

  return (
    <LayoutFlow />
  );
};
