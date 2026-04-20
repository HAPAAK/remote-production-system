import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  NodeStatus,
  WorkflowStatus,
  NodeType,
  SocketEvents,
  NodeStatePayload,
  WorkflowStatePayload,
} from '@rps/shared';
import { WorkflowModel } from '../models/Workflow';
import { getIO } from '../socket';

// ─── Runtime state for a single executing workflow ───────────
interface NodeRuntime {
  node: WorkflowNode;
  timer: ReturnType<typeof setTimeout> | null;
}

interface WorkflowRuntime {
  workflowId: string;
  status: WorkflowStatus;
  nodes: Map<string, NodeRuntime>;
  adjacency: Map<string, string[]>; // downstream neighbors
  inDegree: Map<string, number>;    // total in-degree per node
  resolved: Map<string, number>;    // how many upstreams completed
  startTime: Date;
}

// ─── Singleton Engine ────────────────────────────────────────
class SimulationEngine {
  private runtimes = new Map<string, WorkflowRuntime>();

  // ── START ────────────────────────────────────────────────
  start(workflow: Workflow & { _id: string }): void {
    const wfId = workflow._id.toString();

    // Build adjacency + in-degree
    const adjacency = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const nodesMap = new Map<string, NodeRuntime>();

    for (const node of workflow.nodes) {
      adjacency.set(node.id, []);
      inDegree.set(node.id, 0);
      nodesMap.set(node.id, { node: { ...node, status: NodeStatus.Idle }, timer: null });
    }

    for (const edge of workflow.edges) {
      adjacency.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }

    const runtime: WorkflowRuntime = {
      workflowId: wfId,
      status: WorkflowStatus.Running,
      nodes: nodesMap,
      adjacency,
      inDegree,
      resolved: new Map(workflow.nodes.map((n) => [n.id, 0])),
      startTime: new Date(),
    };

    this.runtimes.set(wfId, runtime);

    // Emit workflow running
    this.emitWorkflowState(runtime);

    // Persist status
    WorkflowModel.findByIdAndUpdate(wfId, {
      status: WorkflowStatus.Running,
      'metrics.startTime': runtime.startTime.toISOString(),
    }).catch((e) => console.error('[engine] persist error', e));

    // Seed: kick off all source nodes (in-degree 0)
    for (const [nodeId, deg] of inDegree) {
      if (deg === 0) {
        this.runNode(runtime, nodeId);
      }
    }
  }

  // ── STOP ─────────────────────────────────────────────────
  stop(workflowId: string): void {
    const runtime = this.runtimes.get(workflowId);
    if (!runtime) return;

    runtime.status = WorkflowStatus.Stopped;

    // Clear all pending timers and set nodes to stopped
    for (const [nodeId, nr] of runtime.nodes) {
      if (nr.timer) clearTimeout(nr.timer);
      if (nr.node.status === NodeStatus.Running || nr.node.status === NodeStatus.Idle) {
        nr.node.status = NodeStatus.Stopped;
        this.emitNodeState(runtime, nodeId);
      }
    }

    this.finalizeWorkflow(runtime, WorkflowStatus.Stopped, null);
    this.runtimes.delete(workflowId);
  }

  // ── RESET ────────────────────────────────────────────────
  reset(workflowId: string): void {
    const runtime = this.runtimes.get(workflowId);
    if (runtime) {
      for (const nr of runtime.nodes.values()) {
        if (nr.timer) clearTimeout(nr.timer);
      }
      this.runtimes.delete(workflowId);
    }
  }

  // ── Node execution (the "Ticker") ───────────────────────
  private runNode(runtime: WorkflowRuntime, nodeId: string): void {
    const nr = runtime.nodes.get(nodeId);
    if (!nr || runtime.status !== WorkflowStatus.Running) return;

    nr.node.status = NodeStatus.Running;
    nr.node.metrics.startTime = new Date().toISOString();
    this.emitNodeState(runtime, nodeId);

    // Persist node status
    this.persistNodeStatus(runtime.workflowId, nodeId, nr.node);

    const delay = nr.node.simulationParams.processingDelay;
    const failProb = nr.node.simulationParams.failureProbability;

    nr.timer = setTimeout(() => {
      // Check if workflow was stopped while waiting
      if (runtime.status !== WorkflowStatus.Running) return;

      const failed = Math.random() < failProb;

      if (failed) {
        this.handleNodeFailure(runtime, nodeId);
      } else {
        this.handleNodeSuccess(runtime, nodeId);
      }
    }, delay);
  }

  private handleNodeSuccess(runtime: WorkflowRuntime, nodeId: string): void {
    const nr = runtime.nodes.get(nodeId)!;
    const now = new Date();

    nr.node.status = NodeStatus.Stopped; // completed successfully
    nr.node.metrics.endTime = now.toISOString();
    nr.node.metrics.durationMs =
      now.getTime() - new Date(nr.node.metrics.startTime!).getTime();

    this.emitNodeState(runtime, nodeId);
    this.persistNodeStatus(runtime.workflowId, nodeId, nr.node);

    // Trigger downstream neighbors
    const downstream = runtime.adjacency.get(nodeId) ?? [];
    for (const targetId of downstream) {
      const count = (runtime.resolved.get(targetId) ?? 0) + 1;
      runtime.resolved.set(targetId, count);

      // Only run when all upstreams have resolved
      if (count >= (runtime.inDegree.get(targetId) ?? 1)) {
        this.runNode(runtime, targetId);
      }
    }

    // Check if all nodes are done (no more running/idle)
    this.checkCompletion(runtime);
  }

  private handleNodeFailure(runtime: WorkflowRuntime, nodeId: string): void {
    const nr = runtime.nodes.get(nodeId)!;
    const now = new Date();

    nr.node.status = NodeStatus.Failed;
    nr.node.metrics.endTime = now.toISOString();
    nr.node.metrics.durationMs =
      now.getTime() - new Date(nr.node.metrics.startTime!).getTime();
    nr.node.error = {
      reason: `${nr.node.type} failed: simulated failure (probability: ${(nr.node.simulationParams.failureProbability * 100).toFixed(0)}%)`,
      timestamp: now.toISOString(),
    };

    this.emitNodeState(runtime, nodeId);
    this.persistNodeStatus(runtime.workflowId, nodeId, nr.node);

    // ── HALT & BLOCK: block all downstream ──
    this.blockDownstream(runtime, nodeId);

    // Mark workflow as failed
    const reason = `Node "${nr.node.label || nodeId}" (${nr.node.type}) failed.`;
    runtime.status = WorkflowStatus.Failed;
    this.finalizeWorkflow(runtime, WorkflowStatus.Failed, reason);
  }

  /** Recursively block all downstream nodes */
  private blockDownstream(runtime: WorkflowRuntime, nodeId: string): void {
    const downstream = runtime.adjacency.get(nodeId) ?? [];
    for (const targetId of downstream) {
      const targetNr = runtime.nodes.get(targetId);
      if (!targetNr) continue;
      if (targetNr.node.status === NodeStatus.Blocked || targetNr.node.status === NodeStatus.Failed) continue;

      // Clear any pending timer
      if (targetNr.timer) clearTimeout(targetNr.timer);

      targetNr.node.status = NodeStatus.Blocked;
      this.emitNodeState(runtime, targetId);
      this.persistNodeStatus(runtime.workflowId, targetId, targetNr.node);

      // Recurse
      this.blockDownstream(runtime, targetId);
    }
  }

  private checkCompletion(runtime: WorkflowRuntime): void {
    for (const nr of runtime.nodes.values()) {
      if (nr.node.status === NodeStatus.Running || nr.node.status === NodeStatus.Idle) {
        return; // still in progress
      }
    }
    // All nodes are in a terminal state
    if (runtime.status === WorkflowStatus.Running) {
      this.finalizeWorkflow(runtime, WorkflowStatus.Stopped, null);
      this.runtimes.delete(runtime.workflowId);
    }
  }

  private finalizeWorkflow(runtime: WorkflowRuntime, status: WorkflowStatus, reason: string | null): void {
    const now = new Date();
    runtime.status = status;

    const metrics = {
      startTime: runtime.startTime.toISOString(),
      endTime: now.toISOString(),
      totalDurationMs: now.getTime() - runtime.startTime.getTime(),
    };

    this.emitWorkflowState(runtime, reason, metrics);

    WorkflowModel.findByIdAndUpdate(runtime.workflowId, {
      status,
      failureReason: reason,
      metrics,
    }).catch((e) => console.error('[engine] persist error', e));
  }

  // ── Socket emitters ─────────────────────────────────────
  private emitNodeState(runtime: WorkflowRuntime, nodeId: string): void {
    const nr = runtime.nodes.get(nodeId);
    if (!nr) return;
    const payload: NodeStatePayload = {
      workflowId: runtime.workflowId,
      nodeId,
      status: nr.node.status,
      metrics: nr.node.metrics,
      error: nr.node.error,
    };
    getIO().to(runtime.workflowId).emit(SocketEvents.NodeStateChanged, payload);
  }

  private emitWorkflowState(
    runtime: WorkflowRuntime,
    reason?: string | null,
    metrics?: Workflow['metrics'],
  ): void {
    const payload: WorkflowStatePayload = {
      workflowId: runtime.workflowId,
      status: runtime.status,
      failureReason: reason ?? null,
      metrics: metrics ?? { startTime: runtime.startTime.toISOString(), endTime: null, totalDurationMs: null },
    };
    getIO().to(runtime.workflowId).emit(SocketEvents.WorkflowStateChanged, payload);
  }

  // ── Persistence helper ──────────────────────────────────
  private persistNodeStatus(workflowId: string, nodeId: string, node: WorkflowNode): void {
    WorkflowModel.findOneAndUpdate(
      { _id: workflowId, 'nodes.id': nodeId },
      {
        $set: {
          'nodes.$.status': node.status,
          'nodes.$.metrics': node.metrics,
          'nodes.$.error': node.error,
        },
      },
    ).catch((e) => console.error('[engine] persist node error', e));
  }
}

// ── Singleton accessor ────────────────────────────────────────
let engine: SimulationEngine | null = null;

export function getEngine(): SimulationEngine {
  if (!engine) engine = new SimulationEngine();
  return engine;
}

