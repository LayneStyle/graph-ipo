import dagre from '@dagrejs/dagre';
import { Node, Edge } from '@xyflow/react';

export function calculateDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (!nodes || nodes.length === 0) return [];

  // Fallback to grid layout if no edges exist or dagre fails
  if (!edges || edges.length === 0) {
    return applyGridLayout(nodes);
  }

  try {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // We assume default width and height if not provided. Adjust if nodes are bigger.
    const nodeWidth = 350;
    const nodeHeight = 250;

    dagreGraph.setGraph({ rankdir: 'TB', ranksep: 100, nodesep: 150 });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    return nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      
      // Node position is top left, but dagre returns center. 
      // Adjusting back to top left.
      const newX = nodeWithPosition.x - nodeWidth / 2;
      const newY = nodeWithPosition.y - nodeHeight / 2;

      return {
        ...node,
        position: { x: newX, y: newY }
      };
    });
  } catch (err) {
    console.error("Dagre layout failed, falling back to grid", err);
    return applyGridLayout(nodes);
  }
}

function applyGridLayout(nodes: Node[]): Node[] {
  const nodeWidth = 350 + 100; // node + padding
  const nodeHeight = 250 + 100;
  const cols = Math.ceil(Math.sqrt(nodes.length));
  
  return nodes.map((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      ...node,
      position: { x: col * nodeWidth, y: row * nodeHeight }
    };
  });
}
