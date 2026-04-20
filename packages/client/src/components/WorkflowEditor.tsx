import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type OnConnect,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import toast from 'react-hot-toast';

import PipelineNode, { type PipelineNodeData } from './nodes/PipelineNode';
import { createWorkflowNode, NODE_DEFAULTS } from './nodes/nodeDefaults';
import PropertyPanel from './panels/PropertyPanel';
import NodePalette from './panels/NodePalette';
import Toolbar from './panels/Toolbar';
import { useWorkflowSocket } from '../hooks/useWorkflowSocket';
import { api } from '../services/api';
import {
  NodeType,
  NodeStatus,
  WorkflowStatus,
  WorkflowValidator,
  type WorkflowNode,
  type Workflow,
  type NodeStatePayload,
  type WorkflowStatePayload,
} from '../types';
import { v4 as uuid } from 'uuid';

const nodeTypes = { pipeline: PipelineNode };

function toFlowNode(wn: WorkflowNode): Node {
  const data: PipelineNodeData = {
    nodeType: wn.type,
    label: wn.label,
    status: wn.status,
    description: wn.description,
    config: wn.data,
    simulationParams: wn.simulationParams,
    error: wn.error,
    metrics: wn.metrics,
  };
  return {
    id: wn.id,
    type: 'pipeline',
    position: wn.position,
    draggable: true,
    selectable: true,
    data,
  };
}

function toFlowEdge(we: { id: string; source: string; target: string }): Edge {
  return { id: we.id, source: we.source, target: we.target, style: { strokeWidth: 2, stroke: '#555' } };
}

interface Props {
  workflowId: string;
  onBack: () => void;
}

export default function WorkflowEditor({ workflowId, onBack }: Props) {
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node>([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [workflowName, setWorkflowName] = useState('');
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>(WorkflowStatus.Idle);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const workflowNodesRef = useRef<WorkflowNode[]>([]);
  const workflowEdgesRef = useRef<{ id: string; source: string; target: string }[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  // ── Load workflow on mount ──
  useEffect(() => {
    api.getWorkflow(workflowId).then((wf: Workflow) => {
      workflowNodesRef.current = wf.nodes;
      workflowEdgesRef.current = wf.edges;
      setFlowNodes(wf.nodes.map(toFlowNode));
      setFlowEdges(wf.edges.map(toFlowEdge));
      setWorkflowName(wf.name);
      setWorkflowStatus(wf.status as WorkflowStatus);
      loadedRef.current = true;
      // Revalidate after loading
      setTimeout(() => {
        setValidation(WorkflowValidator.validate(wf.nodes, wf.edges as any));
      }, 50);
    }).catch((e: any) => toast.error(`Failed to load workflow: ${e.message}`));
  }, [workflowId]);

  // ── Rebuild canonical from flow state ──
  const rebuildCanonical = useCallback(() => {
    setFlowNodes((nodes) => {
      workflowNodesRef.current = nodes.map((fn) => {
        const d = fn.data as unknown as PipelineNodeData;
        const prev = workflowNodesRef.current.find((wn) => wn.id === fn.id);
        return {
          id: fn.id,
          type: d.nodeType,
          label: d.label,
          description: d.description,
          status: d.status,
          data: d.config,
          simulationParams: d.simulationParams,
          metrics: d.metrics,
          error: d.error,
          position: fn.position ?? prev?.position ?? { x: 0, y: 0 },
        };
      });
      return nodes;
    });
  }, []);

  // ── Debounced save ──
  const debounceSave = useCallback(() => {
    if (!loadedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      rebuildCanonical();
      api.updateWorkflow(workflowId, {
        nodes: workflowNodesRef.current,
        edges: workflowEdgesRef.current,
      }).catch(() => {});
    }, 1200);
  }, [workflowId, rebuildCanonical]);

  // ── Validation ──
  const [validation, setValidation] = useState({ valid: false, errors: ['Add nodes to begin.'] });
  const revalidate = useCallback(() => {
    rebuildCanonical();
    setTimeout(() => {
      setValidation(WorkflowValidator.validate(workflowNodesRef.current, workflowEdgesRef.current as any));
    }, 10);
  }, [rebuildCanonical]);

  // ── Node changes (drag, select, remove) ──
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    for (const c of changes) {
      if (c.type === 'select' && c.selected) setSelectedNodeId(c.id);
      // Sync removals to canonical ref
      if (c.type === 'remove') {
        workflowNodesRef.current = workflowNodesRef.current.filter((n) => n.id !== c.id);
        // Also remove edges connected to this node
        workflowEdgesRef.current = workflowEdgesRef.current.filter(
          (e) => e.source !== c.id && e.target !== c.id,
        );
        if (selectedNodeId === c.id) setSelectedNodeId(null);
      }
    }
    if (changes.some((c) => c.type === 'position' || c.type === 'remove')) {
      debounceSave();
      setTimeout(revalidate, 100);
    }
  }, [onNodesChange, debounceSave, revalidate, selectedNodeId]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    setTimeout(() => {
      setFlowEdges((cur) => {
        workflowEdgesRef.current = cur.map((e) => ({ id: e.id, source: e.source, target: e.target }));
        return cur;
      });
      debounceSave();
      revalidate();
    }, 50);
  }, [onEdgesChange, debounceSave, revalidate]);

  // ── Connect ──
  const onConnect: OnConnect = useCallback((connection: Connection) => {
    setFlowNodes((nodes) => {
      const sourceData = nodes.find((n) => n.id === connection.source)?.data as unknown as PipelineNodeData | undefined;
      const targetData = nodes.find((n) => n.id === connection.target)?.data as unknown as PipelineNodeData | undefined;
      if (sourceData && targetData) {
        const err = WorkflowValidator.validateConnection(sourceData.nodeType, targetData.nodeType);
        if (err) { toast.error(err); return nodes; }
      }
      const newEdge: Edge = { id: uuid(), source: connection.source!, target: connection.target!, style: { strokeWidth: 2, stroke: '#555' } };
      setFlowEdges((eds) => {
        const next = addEdge(newEdge, eds);
        workflowEdgesRef.current = next.map((e) => ({ id: e.id, source: e.source, target: e.target }));
        return next;
      });
      debounceSave();
      setTimeout(revalidate, 100);
      return nodes;
    });
  }, [debounceSave, revalidate]);

  // ── Add node from palette ──
  const handleAddNode = useCallback((type: NodeType) => {
    const wn = createWorkflowNode(type, { x: 250 + Math.random() * 300, y: 150 + Math.random() * 200 });
    workflowNodesRef.current = [...workflowNodesRef.current, wn];
    setFlowNodes((prev) => [...prev, toFlowNode(wn)]);
    debounceSave();
    setTimeout(revalidate, 100);
  }, [debounceSave, revalidate]);

  // ── Selected node for property panel ──
  const selectedNode = workflowNodesRef.current.find((n) => n.id === selectedNodeId) ?? null;

  // ── Update node from property panel ──
  const handleNodeUpdate = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    workflowNodesRef.current = workflowNodesRef.current.map((n) =>
      n.id === nodeId ? { ...n, ...updates } : n,
    );
    const updated = workflowNodesRef.current.find((n) => n.id === nodeId);
    if (updated) {
      setFlowNodes((prev) => prev.map((fn) => fn.id === nodeId ? toFlowNode(updated) : fn));
    }
    debounceSave();
    setTimeout(revalidate, 100);
  }, [debounceSave, revalidate]);

  // ── Socket: real-time updates ──
  const handleNodeStateChanged = useCallback((payload: NodeStatePayload) => {
    workflowNodesRef.current = workflowNodesRef.current.map((n) =>
      n.id === payload.nodeId
        ? { ...n, status: payload.status, metrics: payload.metrics, error: payload.error }
        : n,
    );
    const updated = workflowNodesRef.current.find((n) => n.id === payload.nodeId);
    if (updated) {
      setFlowNodes((prev) => prev.map((fn) => fn.id === payload.nodeId ? toFlowNode(updated) : fn));
    }
  }, []);

  const handleWorkflowStateChanged = useCallback((payload: WorkflowStatePayload) => {
    setWorkflowStatus(payload.status);
    if (payload.status === WorkflowStatus.Failed && payload.failureReason) {
      toast.error(`Workflow failed: ${payload.failureReason}`);
    }
    if (payload.status === WorkflowStatus.Stopped && !payload.failureReason) {
      toast.success('Simulation completed!');
    }
  }, []);

  useWorkflowSocket({
    workflowId,
    onNodeStateChanged: handleNodeStateChanged,
    onWorkflowStateChanged: handleWorkflowStateChanged,
  });

  // ── Actions ──
  const handleStart = async () => {
    try {
      rebuildCanonical();
      await api.updateWorkflow(workflowId, { nodes: workflowNodesRef.current, edges: workflowEdgesRef.current });
      await api.executeWorkflow(workflowId, 'start');
      toast.success('Simulation started');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleStop = async () => {
    try { await api.executeWorkflow(workflowId, 'stop'); } catch (e: any) { toast.error(e.message); }
  };

  const handleReset = async () => {
    try {
      await api.executeWorkflow(workflowId, 'reset');
      workflowNodesRef.current = workflowNodesRef.current.map((n) => ({
        ...n, status: NodeStatus.Idle, metrics: { startTime: null, endTime: null, durationMs: null }, error: null,
      }));
      setFlowNodes(workflowNodesRef.current.map(toFlowNode));
      setWorkflowStatus(WorkflowStatus.Idle);
      toast.success('Workflow reset');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleSave = async () => {
    try {
      rebuildCanonical();
      await api.updateWorkflow(workflowId, { nodes: workflowNodesRef.current, edges: workflowEdgesRef.current });
      toast.success('Saved');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="editor-layout">
      <Toolbar
        workflowId={workflowId}
        workflowName={workflowName}
        workflowStatus={workflowStatus}
        isValid={validation.valid}
        validationErrors={validation.errors}
        onStart={handleStart}
        onStop={handleStop}
        onReset={handleReset}
        onSave={handleSave}
        onBack={onBack}
      />
      <div className="editor-body">
        <NodePalette onAdd={handleAddNode} />
        <div className="canvas-wrapper">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            fitView
            fitViewOptions={{ maxZoom: 1, padding: 0.3 }}
            deleteKeyCode={['Delete', 'Backspace']}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls />
            <MiniMap
              style={{ background: '#1a1d27' }}
              maskColor="rgba(0,0,0,0.6)"
              nodeColor={(node: Node) => {
                const d = node.data as unknown as PipelineNodeData;
                return NODE_DEFAULTS[d?.nodeType]?.color ?? '#888';
              }}
            />
          </ReactFlow>
        </div>
        <PropertyPanel node={selectedNode} onUpdate={handleNodeUpdate} />
      </div>
    </div>
  );
}

