import { Router, Request, Response, NextFunction } from 'express';
import { WorkflowModel } from '../models/Workflow';
import { WorkflowValidator, WorkflowStatus, NodeStatus, ExecuteAction } from '@rps/shared';
import { success, fail } from '../utils/response';
import { getEngine } from '../engine/SimulationEngine';

export const workflowRouter = Router();

// Async wrapper
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// ─── GET /  — list all workflows ──────────────────────────────
workflowRouter.get(
  '/',
  wrap(async (_req, res) => {
    const workflows = await WorkflowModel.find().sort({ updatedAt: -1 }).lean();
    res.json(success(workflows));
  }),
);

// ─── POST / — create workflow ─────────────────────────────────
workflowRouter.post(
  '/',
  wrap(async (req, res) => {
    const { name, description, nodes, edges, metadata } = req.body;

    if (!name) {
      res.status(400).json(fail('name is required'));
      return;
    }

    const workflow = await WorkflowModel.create({
      name,
      description: description || '',
      nodes: nodes || [],
      edges: edges || [],
      metadata: metadata || {},
    });

    res.status(201).json(success(workflow.toObject()));
  }),
);

// ─── GET /:id — fetch single workflow ─────────────────────────
workflowRouter.get(
  '/:id',
  wrap(async (req, res) => {
    const workflow = await WorkflowModel.findById(req.params.id).lean();
    if (!workflow) {
      res.status(404).json(fail('Workflow not found'));
      return;
    }
    res.json(success(workflow));
  }),
);

// ─── PUT /:id — update workflow ───────────────────────────────
workflowRouter.put(
  '/:id',
  wrap(async (req, res) => {
    const { name, description, nodes, edges, metadata } = req.body;

    const workflow = await WorkflowModel.findById(req.params.id);
    if (!workflow) {
      res.status(404).json(fail('Workflow not found'));
      return;
    }

    // Cannot edit while running
    if (workflow.status === WorkflowStatus.Running) {
      res.status(409).json(fail('Cannot update a running workflow. Stop it first.'));
      return;
    }

    if (name !== undefined) workflow.name = name;
    if (description !== undefined) workflow.description = description;
    if (nodes !== undefined) workflow.nodes = nodes;
    if (edges !== undefined) workflow.edges = edges;
    if (metadata !== undefined) workflow.metadata = metadata;

    await workflow.save();
    res.json(success(workflow.toObject()));
  }),
);

// ─── DELETE /:id — soft delete ────────────────────────────────
workflowRouter.delete(
  '/:id',
  wrap(async (req, res) => {
    const workflow = await WorkflowModel.findById(req.params.id);
    if (!workflow) {
      res.status(404).json(fail('Workflow not found'));
      return;
    }
    workflow.isDeleted = true;
    await workflow.save();
    res.json(success({ deleted: true }));
  }),
);

// ─── POST /:id/execute — start | stop | reset ────────────────
workflowRouter.post(
  '/:id/execute',
  wrap(async (req, res) => {
    const { action } = req.body as { action: ExecuteAction };

    if (!['start', 'stop', 'reset'].includes(action)) {
      res.status(400).json(fail('action must be one of: start, stop, reset'));
      return;
    }

    const workflow = await WorkflowModel.findById(req.params.id);
    if (!workflow) {
      res.status(404).json(fail('Workflow not found'));
      return;
    }

    const engine = getEngine();

    if (action === 'start') {
      // Validate before execution
      const validation = WorkflowValidator.validate(workflow.nodes as any, workflow.edges as any);
      if (!validation.valid) {
        res.status(422).json(fail(`Validation failed: ${validation.errors.join('; ')}`));
        return;
      }

      if (workflow.status === WorkflowStatus.Running) {
        res.status(409).json(fail('Workflow is already running.'));
        return;
      }

      engine.start(workflow.toObject() as any);
      res.json(success({ message: 'Simulation started.' }));
      return;
    }

    if (action === 'stop') {
      engine.stop(workflow._id!.toString());
      res.json(success({ message: 'Simulation stopped.' }));
      return;
    }

    if (action === 'reset') {
      engine.reset(workflow._id!.toString());

      // Reset persisted state
      workflow.status = WorkflowStatus.Idle;
      workflow.failureReason = null;
      workflow.metrics = { startTime: null, endTime: null, totalDurationMs: null };
      for (const node of workflow.nodes) {
        node.status = NodeStatus.Idle;
        node.metrics = { startTime: null, endTime: null, durationMs: null };
        node.error = null;
      }
      await workflow.save();

      res.json(success({ message: 'Workflow reset to idle.' }));
      return;
    }
  }),
);

