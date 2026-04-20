/**
 * Centralized user-facing strings for the entire system.
 * Single source of truth for all validation messages, labels, and UI text.
 * Change here → changes everywhere.
 */

// ─── Validation Errors ───────────────────────────────────────
export const VALIDATION = {
  EMPTY_WORKFLOW: 'Workflow must contain at least one node.',
  MISSING_INPUT: 'Workflow must have at least one Input Source node.',
  MISSING_OUTPUT: 'Workflow must have at least one Distribution Output node.',
  CYCLE_DETECTED: 'Workflow contains a cycle. Media must flow in one direction (DAG).',
  EDGE_DANGLING: (edgeId: string) => `Edge ${edgeId} references a non-existent node.`,

  // Handle constraints
  INPUT_NO_INCOMING: (label: string) => `Input Source "${label}" cannot receive incoming connections.`,
  OUTPUT_NO_OUTGOING: (label: string) => `Distribution Output "${label}" cannot have outgoing connections.`,

  // Pipeline rules
  PIPELINE_MISSING_UPSTREAM: (targetLabel: string, targetType: string, expectedSource: string) =>
    `"${targetLabel}" (${targetType}) has no incoming connection. It requires a ${expectedSource} upstream.`,
  PIPELINE_WRONG_UPSTREAM: (targetLabel: string, targetType: string, upstreamLabel: string, upstreamType: string, expectedSource: string) =>
    `"${targetLabel}" (${targetType}) is connected to "${upstreamLabel}" (${upstreamType}). It requires input from a ${expectedSource}.`,

  // Connection-time (real-time toast)
  CONNECT_OUTPUT_NO_OUTGOING: 'Distribution Output nodes cannot have outgoing connections.',
  CONNECT_INPUT_NO_INCOMING: 'Input Source nodes cannot have incoming connections.',
  CONNECT_WRONG_UPSTREAM: (targetType: string, expectedSource: string) =>
    `${targetType} requires input from a ${expectedSource} node.`,
};

// ─── Simulation Messages ─────────────────────────────────────
export const SIMULATION = {
  STARTED: 'Simulation started.',
  COMPLETED: 'Simulation completed!',
  WORKFLOW_FAILED: (reason: string) => `Workflow failed: ${reason}`,
  NODE_FAILED: (label: string, nodeId: string, nodeType: string) =>
    `Node "${label || nodeId}" (${nodeType}) failed.`,
  NODE_FAILURE_REASON: (nodeType: string, probability: number) =>
    `${nodeType} failed: simulated failure (probability: ${probability.toFixed(0)}%)`,
  RESET_SUCCESS: 'Workflow reset.',
  SAVED: 'Saved.',
  ALREADY_RUNNING: 'Workflow is already running.',
  CANNOT_UPDATE_RUNNING: 'Cannot update a running workflow. Stop it first.',
};

// ─── API Messages ────────────────────────────────────────────
export const API = {
  NAME_REQUIRED: 'name is required.',
  NOT_FOUND: 'Workflow not found.',
  INVALID_ACTION: 'action must be one of: start, stop, reset.',
  VALIDATION_FAILED: (errors: string) => `Validation failed: ${errors}`,
};

// ─── UI Labels ───────────────────────────────────────────────
export const UI = {
  APP_TITLE: '🎬 Remote Production Workflows',
  APP_SUBTITLE: 'Visual workflow builder for remote production pipelines',
  NEW_WORKFLOW: '+ New Workflow',
  NO_WORKFLOWS: 'No workflows yet. Click "New Workflow" to get started.',
  LOADING: 'Loading...',
  ADD_NODES_HINT: 'Add nodes to begin.',
  SELECT_NODE_HINT: 'Select a node to configure',
  CLICK_TO_RENAME: 'Click to rename',
  NO_DESCRIPTION: 'No description',
  DELETE: 'Delete',
  DELETED: 'Deleted.',
  BACK: '← Back',
  SAVE: '💾 Save',
  START: '▶ Start',
  STOP: '⏹ Stop',
  RESET: '🔄 Reset',
  STATUS_COMPLETED: 'completed',
  // Node palette
  ADD_NODE: 'Add Node',
  // Property panel
  NODE_PROPERTIES: 'Node Properties',
  CONFIGURATION: 'Configuration',
  SIMULATION_SECTION: 'Simulation',
  ERROR_SECTION: 'Error',
  METRICS_SECTION: 'Metrics',
  LABEL: 'Label',
  DESCRIPTION: 'Description',
  FAILURE_PROBABILITY: (pct: number) => `Failure Probability: ${pct}%`,
  PROCESSING_DELAY: (ms: number) => `Processing Delay: ${ms}ms`,
  DURATION: (ms: number) => `Duration: ${ms}ms`,
};
