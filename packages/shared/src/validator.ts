import { NodeType, WorkflowNode, WorkflowEdge } from './types';
import { VALIDATION } from './constants';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Centralized validation for workflow graphs.
 * Used by both backend (strict gate) and frontend (optimistic feedback).
 */
export class WorkflowValidator {
  // ── Public API ──────────────────────────────────────────────

  static validate(nodes: WorkflowNode[], edges: WorkflowEdge[]): ValidationResult {
    const errors: string[] = [];

    if (nodes.length === 0) {
      errors.push(VALIDATION.EMPTY_WORKFLOW);
      return { valid: false, errors };
    }

    errors.push(...this.checkEndpoints(nodes));
    errors.push(...this.checkHandleConstraints(nodes, edges));
    errors.push(...this.checkPipelineRules(nodes, edges));
    errors.push(...this.checkDAG(nodes, edges));

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate a single proposed connection before it's added.
   * Returns null if valid, or an error string.
   */
  static validateConnection(
    sourceNode: WorkflowNode,
    targetNode: WorkflowNode,
  ): string | null {
    if (sourceNode.type === NodeType.DistributionOutput)
      return VALIDATION.CONNECT_OUTPUT_NO_OUTGOING;

    if (targetNode.type === NodeType.InputSource)
      return VALIDATION.CONNECT_INPUT_NO_INCOMING;

    // Strict Pipeline rules
    if (targetNode.type === NodeType.Encoder && sourceNode.type !== NodeType.InputSource)
      return VALIDATION.CONNECT_WRONG_UPSTREAM('Encoder', 'Input Source');
    if (targetNode.type === NodeType.Transport && sourceNode.type !== NodeType.Encoder)
      return VALIDATION.CONNECT_WRONG_UPSTREAM('Transport', 'Encoder');
    if (targetNode.type === NodeType.StudioProcessing && sourceNode.type !== NodeType.Transport)
      return VALIDATION.CONNECT_WRONG_UPSTREAM('Studio Processing', 'Transport');
    if (targetNode.type === NodeType.DistributionOutput && sourceNode.type !== NodeType.StudioProcessing)
      return VALIDATION.CONNECT_WRONG_UPSTREAM('Distribution Output', 'Studio Processing');

    return null;
  }

  // ── Private Validators ──────────────────────────────────────

  /** At least one InputSource and one DistributionOutput */
  private static checkEndpoints(nodes: WorkflowNode[]): string[] {
    const errors: string[] = [];
    if (!nodes.some((n) => n.type === NodeType.InputSource)) errors.push(VALIDATION.MISSING_INPUT);
    if (!nodes.some((n) => n.type === NodeType.DistributionOutput)) errors.push(VALIDATION.MISSING_OUTPUT);
    return errors;
  }

  /** InputSource: outgoing only. DistributionOutput: incoming only. */
  private static checkHandleConstraints(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    const errors: string[] = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    for (const edge of edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) { errors.push(VALIDATION.EDGE_DANGLING(edge.id)); continue; }
      if (target.type === NodeType.InputSource) errors.push(VALIDATION.INPUT_NO_INCOMING(target.label));
      if (source.type === NodeType.DistributionOutput) errors.push(VALIDATION.OUTPUT_NO_OUTGOING(source.label));
    }
    return errors;
  }

  /**
   * Enforces strict pipeline order:
   * Input Source -> Encoder -> Transport -> Studio Processing -> Distribution Output
   */
  private static checkPipelineRules(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    const errors: string[] = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const checkUpstream = (targetType: NodeType, expectedUpstreamType: NodeType, targetName: string, expectedName: string) => {
      for (const t of nodes.filter((n) => n.type === targetType)) {
        const incoming = edges.filter((e) => e.target === t.id);
        if (incoming.length === 0) {
          errors.push(VALIDATION.PIPELINE_MISSING_UPSTREAM(t.label, targetName, expectedName));
          continue;
        }
        for (const e of incoming) {
          const up = nodeMap.get(e.source);
          if (up && up.type !== expectedUpstreamType) {
            errors.push(VALIDATION.PIPELINE_WRONG_UPSTREAM(t.label, targetName, up.label, up.type, expectedName));
          }
        }
      }
    };

    checkUpstream(NodeType.Encoder, NodeType.InputSource, 'Encoder', 'Input Source');
    checkUpstream(NodeType.Transport, NodeType.Encoder, 'Transport', 'Encoder');
    checkUpstream(NodeType.StudioProcessing, NodeType.Transport, 'Studio Processing', 'Transport');
    checkUpstream(NodeType.DistributionOutput, NodeType.StudioProcessing, 'Distribution Output', 'Studio Processing');

    return errors;
  }

  /** DAG check via Kahn's algorithm (topological sort). If not all nodes are visited → cycle exists. */
  private static checkDAG(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    for (const node of nodes) { inDegree.set(node.id, 0); adjacency.set(node.id, []); }
    for (const edge of edges) {
      adjacency.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
    const queue: string[] = [];
    for (const [id, deg] of inDegree) { if (deg === 0) queue.push(id); }
    let visited = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      visited++;
      for (const neighbor of adjacency.get(current) ?? []) {
        const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }
    if (visited < nodes.length) return [VALIDATION.CYCLE_DETECTED];
    return [];
  }
}
