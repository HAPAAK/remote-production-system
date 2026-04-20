import { useState } from 'react';
import { WorkflowStatus } from '../../types';
import { api } from '../../services/api';

interface Props {
  workflowId: string;
  workflowName: string;
  workflowStatus: WorkflowStatus;
  isValid: boolean;
  validationErrors: string[];
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onSave: () => void;
  onBack: () => void;
}

export default function Toolbar({
  workflowId,
  workflowName,
  workflowStatus,
  isValid,
  validationErrors,
  onStart,
  onStop,
  onReset,
  onSave,
  onBack,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(workflowName);

  // Sync when prop changes
  if (!editing && name !== workflowName && workflowName) setName(workflowName);

  const saveName = () => {
    setEditing(false);
    if (name.trim() && name !== workflowName) {
      api.updateWorkflow(workflowId, { name: name.trim() }).catch(() => {});
    }
  };

  const isRunning = workflowStatus === WorkflowStatus.Running;
  const isFailed = workflowStatus === WorkflowStatus.Failed;
  const isIdle = workflowStatus === WorkflowStatus.Idle;
  const isStopped = workflowStatus === WorkflowStatus.Stopped;

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        {editing ? (
          <input
            className="name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            autoFocus
          />
        ) : (
          <h2 onClick={() => setEditing(true)} style={{ cursor: 'pointer' }} title="Click to rename">
            {workflowName || 'Untitled'}
          </h2>
        )}
        <span className={`status-badge status-${workflowStatus}`}>{workflowStatus}</span>
      </div>

      <div className="toolbar-center">
        {!isValid && (
          <div className="validation-warnings">
            ⚠️ {validationErrors[0]}
            {validationErrors.length > 1 && ` (+${validationErrors.length - 1} more)`}
          </div>
        )}
      </div>

      <div className="toolbar-right">
        <button className="btn btn-secondary" onClick={onSave}>💾 Save</button>
        {(isIdle || isStopped || isFailed) && (
          <button className="btn btn-primary" onClick={onStart} disabled={!isValid}>
            ▶ Start
          </button>
        )}
        {isRunning && (
          <button className="btn btn-danger" onClick={onStop}>
            ⏹ Stop
          </button>
        )}
        {(isFailed || isStopped) && (
          <button className="btn btn-secondary" onClick={onReset}>
            🔄 Reset
          </button>
        )}
      </div>
    </div>
  );
}
