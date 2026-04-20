import mongoose, { Schema, Document } from 'mongoose';
import {
  Workflow,
  WorkflowStatus,
  NodeStatus,
  NodeType,
} from '@rps/shared';

export interface WorkflowDocument extends Omit<Workflow, '_id'>, Document {}

const NodeSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: Object.values(NodeType), required: true },
    label: { type: String, default: '' },
    description: { type: String, default: '' },
    status: { type: String, enum: Object.values(NodeStatus), default: NodeStatus.Idle },
    data: { type: Schema.Types.Mixed, default: {} },
    simulationParams: {
      failureProbability: { type: Number, default: 0 },
      processingDelay: { type: Number, default: 1000 },
    },
    metrics: {
      startTime: { type: String, default: null },
      endTime: { type: String, default: null },
      durationMs: { type: Number, default: null },
    },
    error: { type: Schema.Types.Mixed, default: null },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
  },
  { _id: false },
);

const EdgeSchema = new Schema(
  {
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
  },
  { _id: false },
);

const WorkflowSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, enum: Object.values(WorkflowStatus), default: WorkflowStatus.Idle },
    failureReason: { type: String, default: null },
    nodes: { type: [NodeSchema], default: [] },
    edges: { type: [EdgeSchema], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
    metrics: {
      startTime: { type: String, default: null },
      endTime: { type: String, default: null },
      totalDurationMs: { type: Number, default: null },
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Soft-delete: default queries exclude deleted documents
WorkflowSchema.pre(/^find/, function (this: any, next) {
  if (this.getFilter().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
});

export const WorkflowModel = mongoose.model<WorkflowDocument>('Workflow', WorkflowSchema);

