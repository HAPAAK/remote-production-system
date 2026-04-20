import { NodeType, NodeStatus, type WorkflowNode } from '../../types';
import { v4 as uuid } from 'uuid';

interface NodeDefaults {
  label: string;
  data: Record<string, any>;
  color: string;
  icon: string;
}

export const NODE_DEFAULTS: Record<NodeType, NodeDefaults> = {
  [NodeType.InputSource]: {
    label: 'Input Source',
    data: { sourceType: 'camera', resolution: '1920x1080', fps: 30 },
    color: '#22c55e',
    icon: '📹',
  },
  [NodeType.Encoder]: {
    label: 'Encoder',
    data: { codec: 'H.264', bitrate: 5000 },
    color: '#3b82f6',
    icon: '⚙️',
  },
  [NodeType.Transport]: {
    label: 'Transport',
    data: { protocol: 'SRT', latency: 200 },
    color: '#f59e0b',
    icon: '🔗',
  },
  [NodeType.StudioProcessing]: {
    label: 'Studio Processing',
    data: { task: 'mixing' },
    color: '#8b5cf6',
    icon: '🎬',
  },
  [NodeType.DistributionOutput]: {
    label: 'Distribution Output',
    data: { platform: 'youtube', targetUrl: '' },
    color: '#ef4444',
    icon: '📡',
  },
};

export const STATUS_COLORS: Record<NodeStatus, string> = {
  [NodeStatus.Idle]: '#6b7280',
  [NodeStatus.Running]: '#3b82f6',
  [NodeStatus.Failed]: '#ef4444',
  [NodeStatus.Stopped]: '#22c55e',
  [NodeStatus.Blocked]: '#9ca3af',
};

export function createWorkflowNode(type: NodeType, position: { x: number; y: number }): WorkflowNode {
  const defaults = NODE_DEFAULTS[type];
  return {
    id: uuid(),
    type,
    label: defaults.label,
    description: '',
    status: NodeStatus.Idle,
    data: { ...defaults.data },
    simulationParams: { failureProbability: 0.05, processingDelay: 2000 },
    metrics: { startTime: null, endTime: null, durationMs: null },
    error: null,
    position,
  };
}

