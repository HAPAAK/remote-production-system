import { NodeType, type WorkflowNode } from '../../types';

interface Props {
  node: WorkflowNode | null;
  onUpdate: (nodeId: string, updates: Partial<WorkflowNode>) => void;
}

export default function PropertyPanel({ node, onUpdate }: Props) {
  if (!node) {
    return (
      <div className="property-panel empty">
        <p>Select a node to configure</p>
      </div>
    );
  }

  const update = (field: string, value: any) => {
    onUpdate(node.id, { data: { ...node.data, [field]: value } });
  };

  const updateSim = (field: string, value: number) => {
    onUpdate(node.id, {
      simulationParams: { ...node.simulationParams, [field]: value },
    });
  };

  const updateLabel = (label: string) => {
    onUpdate(node.id, { label });
  };

  return (
    <div className="property-panel">
      <h3>Node Properties</h3>

      <label>Label</label>
      <input value={node.label} onChange={(e) => updateLabel(e.target.value)} />

      <label>Description</label>
      <textarea
        value={node.description}
        onChange={(e) => onUpdate(node.id, { description: e.target.value })}
        rows={2}
      />

      <hr />
      <h4>Configuration</h4>
      {renderTypeFields(node, update)}

      <hr />
      <h4>Simulation</h4>
      <label>Failure Probability: {(node.simulationParams.failureProbability * 100).toFixed(0)}%</label>
      <input
        type="range"
        min={0}
        max={100}
        value={node.simulationParams.failureProbability * 100}
        onChange={(e) => updateSim('failureProbability', Number(e.target.value) / 100)}
      />
      <label>Processing Delay: {node.simulationParams.processingDelay}ms</label>
      <input
        type="range"
        min={100}
        max={10000}
        step={100}
        value={node.simulationParams.processingDelay}
        onChange={(e) => updateSim('processingDelay', Number(e.target.value))}
      />

      {node.error && (
        <>
          <hr />
          <h4 style={{ color: '#ef4444' }}>Error</h4>
          <p className="error-text">{node.error.reason}</p>
        </>
      )}

      {node.metrics.durationMs !== null && (
        <>
          <hr />
          <h4>Metrics</h4>
          <p>Duration: {node.metrics.durationMs}ms</p>
        </>
      )}
    </div>
  );
}

function renderTypeFields(node: WorkflowNode, update: (f: string, v: any) => void) {
  switch (node.type) {
    case NodeType.InputSource:
      return (
        <>
          <label>Source Type</label>
          <select value={node.data.sourceType || 'camera'} onChange={(e) => update('sourceType', e.target.value)}>
            <option value="camera">Camera</option>
            <option value="srt_ingest">SRT Ingest</option>
            <option value="ndi">NDI</option>
          </select>
          <label>Resolution</label>
          <select value={node.data.resolution || '1920x1080'} onChange={(e) => update('resolution', e.target.value)}>
            <option value="1920x1080">1080p</option>
            <option value="3840x2160">4K</option>
            <option value="1280x720">720p</option>
          </select>
          <label>FPS</label>
          <select value={node.data.fps || 30} onChange={(e) => update('fps', Number(e.target.value))}>
            <option value={24}>24</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
        </>
      );
    case NodeType.Encoder:
      return (
        <>
          <label>Codec</label>
          <select value={node.data.codec || 'H.264'} onChange={(e) => update('codec', e.target.value)}>
            <option value="H.264">H.264</option>
            <option value="HEVC">HEVC</option>
            <option value="AV1">AV1</option>
          </select>
          <label>Bitrate: {node.data.bitrate || 5000} kbps</label>
          <input
            type="range"
            min={500}
            max={50000}
            step={500}
            value={node.data.bitrate || 5000}
            onChange={(e) => update('bitrate', Number(e.target.value))}
          />
        </>
      );
    case NodeType.Transport:
      return (
        <>
          <label>Protocol</label>
          <select value={node.data.protocol || 'SRT'} onChange={(e) => update('protocol', e.target.value)}>
            <option value="SRT">SRT</option>
            <option value="RIST">RIST</option>
            <option value="RTP">RTP</option>
          </select>
          <label>Latency: {node.data.latency || 200}ms</label>
          <input
            type="range"
            min={20}
            max={2000}
            step={10}
            value={node.data.latency || 200}
            onChange={(e) => update('latency', Number(e.target.value))}
          />
        </>
      );
    case NodeType.StudioProcessing:
      return (
        <>
          <label>Task</label>
          <select value={node.data.task || 'mixing'} onChange={(e) => update('task', e.target.value)}>
            <option value="mixing">Mixing</option>
            <option value="graphics_overlay">Graphics Overlay</option>
            <option value="audio_mix">Audio Mix</option>
            <option value="ingest_decode">Ingest / Decode</option>
          </select>
        </>
      );
    case NodeType.DistributionOutput:
      return (
        <>
          <label>Platform</label>
          <select value={node.data.platform || 'youtube'} onChange={(e) => update('platform', e.target.value)}>
            <option value="youtube">YouTube</option>
            <option value="twitch">Twitch</option>
            <option value="cdn">CDN</option>
            <option value="tv_broadcast">TV Broadcast</option>
          </select>
          <label>Target URL</label>
          <input
            value={node.data.targetUrl || ''}
            placeholder="rtmp://..."
            onChange={(e) => update('targetUrl', e.target.value)}
          />
        </>
      );
    default:
      return null;
  }
}

