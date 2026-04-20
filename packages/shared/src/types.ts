// ─── Node Types ───────────────────────────────────────────────
export enum NodeType {
  InputSource = 'input_source',
  Encoder = 'encoder',
  Transport = 'transport',
  StudioProcessing = 'studio_processing',
  DistributionOutput = 'distribution_output',
}

// ─── Status Enums ─────────────────────────────────────────────
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

// ─── Node Data (type-specific configuration) ─────────────────
export interface InputSourceData {
  sourceType: 'camera' | 'srt_ingest' | 'ndi';
  resolution: string;
  fps: number;
}

export interface EncoderData {
  codec: 'H.264' | 'HEVC' | 'AV1';
  bitrate: number; // kbps
}

export interface TransportData {
  protocol: 'SRT' | 'RIST' | 'RTP';
  latency: number; // ms
}

export interface StudioProcessingData {
  task: 'mixing' | 'graphics_overlay' | 'audio_mix' | 'ingest_decode';
}

export interface DistributionOutputData {
  platform: 'youtube' | 'twitch' | 'cdn' | 'tv_broadcast';
  targetUrl: string;
}

export type NodeData =
  | InputSourceData
  | EncoderData
  | TransportData
  | StudioProcessingData
  | DistributionOutputData;

// ─── Simulation Parameters (shared across all nodes) ─────────
export interface SimulationParams {
  failureProbability: number; // 0–1
  processingDelay: number;    // ms
}

// ─── Workflow Node ────────────────────────────────────────────
export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  status: NodeStatus;
  data: NodeData;
  simulationParams: SimulationParams;
  metrics: {
    startTime: string | null;
    endTime: string | null;
    durationMs: number | null;
  };
  error: {
    reason: string;
    timestamp: string;
  } | null;
  // React Flow positional data
  position: { x: number; y: number };
}

// ─── Workflow Edge ────────────────────────────────────────────
export interface WorkflowEdge {
  id: string;
  source: string; // node id
  target: string; // node id
}

// ─── Workflow ─────────────────────────────────────────────────
export interface Workflow {
  _id?: string;
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
  createdAt?: string;
  updatedAt?: string;
}

// ─── Standardized API Response Envelope ──────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  metadata: {
    timestamp: string;
    version: string;
  };
  error: string | null;
}

// ─── Socket Events ───────────────────────────────────────────
export enum SocketEvents {
  JoinWorkflow = 'workflow:join',
  LeaveWorkflow = 'workflow:leave',
  NodeStateChanged = 'node:state_changed',
  WorkflowStateChanged = 'workflow:state_changed',
  SimulationLog = 'simulation:log',
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

// ─── Execute Action ──────────────────────────────────────────
export type ExecuteAction = 'start' | 'stop' | 'reset';

