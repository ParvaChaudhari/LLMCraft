/**
 * Builds an execution context for standalone node execution.
 * Walks backwards through the graph from the target node,
 * collecting outputs from all upstream nodes (pinnedOutput first, then output).
 */
export function buildNodeContext(
  nodeId: string,
  nodes: any[],
  edges: any[]
): Record<string, any> {
  const context: Record<string, any> = {};
  const visited = new Set<string>();

  function walkUpstream(currentNodeId: string) {
    if (visited.has(currentNodeId)) return;
    visited.add(currentNodeId);

    const incomingEdges = edges.filter((e) => e.target === currentNodeId);
    for (const edge of incomingEdges) {
      const upstreamNode = nodes.find((n) => n.id === edge.source);
      if (!upstreamNode) continue;

      // Use pinnedOutput if available, otherwise use last known output
      const output = upstreamNode.data?.pinnedOutput ?? upstreamNode.data?.output;
      if (output !== undefined && output !== null) {
        context[upstreamNode.id] = output;
        context.lastOutput = output; // lastOutput always = most recent upstream
      }

      walkUpstream(upstreamNode.id);
    }
  }

  walkUpstream(nodeId);
  return context;
}
