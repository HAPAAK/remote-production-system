import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NodeType, NodeStatus } from '../../types';
import { NODE_DEFAULTS, STATUS_COLORS } from './nodeDefaults';

export interface PipelineNodeData {
  nodeType: NodeType;
  label: string;
  status: NodeStatus;
  description: string;
  config: Record<string, any>;
  simulationParams: { failureProbability: number; processingDelay: number };
  error: { reason: string; timestamp: string } | null;
  metrics: { startTime: string | null; endTime: string | null; durationMs: number | null };
}

function getConfigSummary(nodeType: NodeType, config: Record<string, any>): string[] {
  switch (nodeType) {
    case NodeType.InputSource:
      return [
        config.sourceType?.replace('_', ' ') || 'camera',
        config.resolution || '1080p',
        `${config.fps || 30}fps`,
      ];
    case NodeType.Encoder:
      return [
        config.codec || 'H.264',
        `${config.bitrate || 5000} kbps`,
      ];
    case NodeType.Transport:
      return [
        config.protocol || 'SRT',
        `${config.latency || 200}ms latency`,
      ];
    case NodeType.StudioProcessing:
      return [
        (config.task || 'mixing').replace('_', ' '),
      ];
    case NodeType.DistributionOutput:
      return [
        config.platform || 'youtube',
        config.targetUrl ? '🔗 configured' : '⚠ no URL',
      ];
    default:
      return [];
  }
}

function PipelineNode({ data, selected }: NodeProps) {
  const d = data as unknown as PipelineNodeData;
  const defaults = NODE_DEFAULTS[d.nodeType];
  const statusColor = STATUS_COLORS[d.status];
  const isRunning = d.status === NodeStatus.Running;
  const isFailed = d.status === NodeStatus.Failed;
  const isBlocked = d.status === NodeStatus.Blocked;

  const showTarget = d.nodeType !== NodeType.InputSource;
  const showSource = d.nodeType !== NodeType.DistributionOutput;
  const displayStatus = d.status === NodeStatus.Stopped ? 'completed' : d.status;
  const configTags = getConfigSummary(d.nodeType, d.config);

  return (
    <div
      className={`pipeline-node ${isRunning ? 'running' : ''} ${isFailed ? 'failed' : ''} ${isBlocked ? 'blocked' : ''} ${selected ? 'selected' : ''}`}
      style={{
        borderColor: selected ? defaults.color : statusColor,
        borderWidth: 2,
        opacity: isBlocked ? 0.5 : 1,
      }}
    >
      {showTarget && <Handle type="target" position={Position.Left} className="handle" />}

      <div className="node-header" style={{ backgroundColor: defaults.color }}>
        <span className="node-icon">{defaults.icon}</span>
        <span className="node-title">{d.label}</span>
      </div>

      <div className="node-body">
        {configTags.length > 0 && (
          <div className="node-config-tags">
            {configTags.map((tag, i) => (
              <span key={i} className="config-tag">{tag}</span>
            ))}
          </div>
        )}
        <div className="node-status" style={{ color: statusColor }}>
          <span className={`status-dot ${isRunning ? 'pulse' : ''}`} style={{ backgroundColor: statusColor }} />
          {displayStatus}
        </div>
        {d.error && (
          <div className="node-error">{d.error.reason}</div>
        )}
        {d.metrics.durationMs !== null && (
          <div className="node-metric">⏱ {d.metrics.durationMs}ms</div>
        )}
      </div>

      {showSource && <Handle type="source" position={Position.Right} className="handle" />}
    </div>
  );
}

export default memo(PipelineNode);

