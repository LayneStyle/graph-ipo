import { Node, Edge } from '@xyflow/react';

export function computeTracedPath(
  startNodeId: string,
  nodes: Node[],
  edges: Edge[]
): { tracedNodeIds: Set<string>; tracedEdgeIds: Set<string> } {
  const tracedNodeIds = new Set<string>();
  const tracedEdgeIds = new Set<string>();

  // Build adjacency lists for forward and backward traversal
  const forwardEdges = new Map<string, Edge[]>();
  const backwardEdges = new Map<string, Edge[]>();

  for (const edge of edges) {
    if (!forwardEdges.has(edge.source)) forwardEdges.set(edge.source, []);
    forwardEdges.get(edge.source)!.push(edge);

    if (!backwardEdges.has(edge.target)) backwardEdges.set(edge.target, []);
    backwardEdges.get(edge.target)!.push(edge);
  }

  // Helper to traverse in one direction
  const traverse = (directionMap: Map<string, Edge[]>, getNextNode: (edge: Edge) => string) => {
    const q = [startNodeId];
    const visitedNodes = new Set<string>();
    visitedNodes.add(startNodeId);

    while (q.length > 0) {
      const current = q.shift()!;
      
      const adjacentEdges = directionMap.get(current) || [];
      for (const edge of adjacentEdges) {
        tracedEdgeIds.add(edge.id);
        const nextNode = getNextNode(edge);
        if (!visitedNodes.has(nextNode)) {
          visitedNodes.add(nextNode);
          tracedNodeIds.add(nextNode);
          q.push(nextNode);
        }
      }
    }
  };

  // Traverse both downstream and upstream
  traverse(forwardEdges, e => e.target);
  traverse(backwardEdges, e => e.source);

  // Ensure start node is included
  tracedNodeIds.add(startNodeId);

  return { tracedNodeIds, tracedEdgeIds };
}
