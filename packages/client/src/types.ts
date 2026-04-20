// Re-export shared types for use in the client.
// These mirror @rps/shared exactly but are defined here for ESM compatibility.

export enum NodeType {
  InputSource = 'input_source',
  Encoder = 'encoder',
  Transport = 'transport',
  StudioProcessing = 'studio_processing',
  DistributionOutput = 'distribution_output',
}

export enum NodeStatus {
  Idle = 'idle',
  Running = 'running',
  Failed = 'failed',
  Stopped = 'stopped',
  Blocked = 'blocked',
}

export enum WorkflowStatus {
  Idle = 'idle',
  Running = 'running',
  Failed = 'failed',
  Stopped = 'stopped',
}

export enum SocketEvents {
  JoinWorkflow = 'workflow:join',
  LeaveWorkflow = 'workflow:leave',
  NodeStateChanged = 'node:state_changed',
  WorkflowStateChanged = 'workflow:state_changed',
  SimulationLog = 'simulation:log',
}

export interface SimulationParams {
  failureProbability: number;
  processingDelay: number;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  status: NodeStatus;
  data: Record<string, any>;
  simulationParams: SimulationParams;
  metrics: {
    startTime: string | null;
    endTime: string | null;
    durationMs: number | null;
  };
  error: { reason: string; timestamp: string } | null;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface Workflow {
  _id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  failureReason: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata: Record<string, unknown>;
  metrics: {
    startTime: string | null;
    endTime: string | null;
    totalDurationMs: number | null;
  };
  isDeleted: boolean;
}

export interface NodeStatePayload {
  workflowId: string;
  nodeId: string;
  status: NodeStatus;
  metrics: WorkflowNode['metrics'];
  error: WorkflowNode['error'];
}

export interface WorkflowStatePayload {
  workflowId: string;
  status: WorkflowStatus;
  failureReason: string | null;
  metrics: Workflow['metrics'];
}

// ─── Validator (client-side, same logic as server) ───────────
import { VALIDATION } from './constants';

export class WorkflowValidator {
  static validate(nodes: WorkflowNode[], edges: WorkflowEdge[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (nodes.length === 0) {
      errors.push(VALIDATION.EMPTY_WORKFLOW);
      return { valid: false, errors };
    }
    if (!nodes.some((n) => n.type === NodeType.InputSource)) errors.push(VALIDATION.MISSING_INPUT);
    if (!nodes.some((n) => n.type === NodeType.DistributionOutput)) errors.push(VALIDATION.MISSING_OUTPUT);

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    for (const edge of edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) continue;
      if (target.type === NodeType.InputSource) errors.push(VALIDATION.INPUT_NO_INCOMING(target.label));
      if (source.type === NodeType.DistributionOutput) errors.push(VALIDATION.OUTPUT_NO_OUTGOING(source.label));
    }

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

    const inDeg = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const n of nodes) { inDeg.set(n.id, 0); adj.set(n.id, []); }
    for (const e of edges) { adj.get(e.source)?.push(e.target); inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1); }
    const queue: string[] = [];
    for (const [id, d] of inDeg) { if (d === 0) queue.push(id); }
    let visited = 0;
    while (queue.length) {
      const cur = queue.shift()!;
      visited++;
      for (const nb of adj.get(cur) ?? []) { const nd = (inDeg.get(nb) ?? 1) - 1; inDeg.set(nb, nd); if (nd === 0) queue.push(nb); }
    }
    if (visited < nodes.length) errors.push(VALIDATION.CYCLE_DETECTED);

    return { valid: errors.length === 0, errors };
  }

  static validateConnection(sourceType: NodeType, targetType: NodeType): string | null {
    if (sourceType === NodeType.DistributionOutput) return VALIDATION.CONNECT_OUTPUT_NO_OUTGOING;
    if (targetType === NodeType.InputSource) return VALIDATION.CONNECT_INPUT_NO_INCOMING;

    if (targetType === NodeType.Encoder && sourceType !== NodeType.InputSource) return VALIDATION.CONNECT_WRONG_UPSTREAM('Encoder', 'Input Source');
    if (targetType === NodeType.Transport && sourceType !== NodeType.Encoder) return VALIDATION.CONNECT_WRONG_UPSTREAM('Transport', 'Encoder');
    if (targetType === NodeType.StudioProcessing && sourceType !== NodeType.Transport) return VALIDATION.CONNECT_WRONG_UPSTREAM('Studio Processing', 'Transport');
    if (targetType === NodeType.DistributionOutput && sourceType !== NodeType.StudioProcessing) return VALIDATION.CONNECT_WRONG_UPSTREAM('Distribution Output', 'Studio Processing');

    return null;
  }
}

