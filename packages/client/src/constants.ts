/**
 * Centralized user-facing strings — client copy.
 * Mirrors packages/shared/src/constants.ts for ESM compatibility.
 * Single place to change any user-facing text on the frontend.
 */

export const VALIDATION = {
  EMPTY_WORKFLOW: 'Workflow must contain at least one node.',
  MISSING_INPUT: 'Workflow must have at least one Input Source node.',
  MISSING_OUTPUT: 'Workflow must have at least one Distribution Output node.',
  CYCLE_DETECTED: 'Workflow contains a cycle. Media must flow in one direction (DAG).',

  INPUT_NO_INCOMING: (label: string) => `Input Source "${label}" cannot receive incoming connections.`,
  OUTPUT_NO_OUTGOING: (label: string) => `Distribution Output "${label}" cannot have outgoing connections.`,

  PIPELINE_MISSING_UPSTREAM: (targetLabel: string, targetType: string, expectedSource: string) =>
    `"${targetLabel}" (${targetType}) has no incoming connection. It requires a ${expectedSource} upstream.`,
  PIPELINE_WRONG_UPSTREAM: (targetLabel: string, targetType: string, upstreamLabel: string, upstreamType: string, expectedSource: string) =>
    `"${targetLabel}" (${targetType}) is connected to "${upstreamLabel}" (${upstreamType}). It requires input from a ${expectedSource}.`,

  CONNECT_OUTPUT_NO_OUTGOING: 'Distribution Output nodes cannot have outgoing connections.',
  CONNECT_INPUT_NO_INCOMING: 'Input Source nodes cannot have incoming connections.',
  CONNECT_WRONG_UPSTREAM: (targetType: string, expectedSource: string) =>
    `${targetType} requires input from a ${expectedSource} node.`,
};

export const SIMULATION = {
  STARTED: 'Simulation started.',
  COMPLETED: 'Simulation completed!',
  WORKFLOW_FAILED: (reason: string) => `Workflow failed: ${reason}`,
  RESET_SUCCESS: 'Workflow reset.',
  SAVED: 'Saved.',
};

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
  ADD_NODE: 'Add Node',
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
  LOAD_FAILED: (msg: string) => `Failed to load workflow: ${msg}`,
};
