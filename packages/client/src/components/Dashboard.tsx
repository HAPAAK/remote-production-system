import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import type { Workflow } from '../types';

interface Props {
  onOpen: (id: string) => void;
}

const ADJECTIVES = ['Live', 'Remote', 'Studio', 'Field', 'Mobile', 'Primary', 'Backup', 'Main'];
const NOUNS = ['Broadcast', 'Stream', 'Production', 'Feed', 'Pipeline', 'Show', 'Event', 'Session'];

function generateName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj} ${noun} ${num}`;
}

export default function Dashboard({ onOpen }: Props) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.listWorkflows()
      .then(setWorkflows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    try {
      const wf = await api.createWorkflow({ name: generateName() });
      onOpen(wf._id);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteWorkflow(id);
      toast.success('Deleted');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🎬 Remote Production Workflows</h1>
        <p>Visual workflow builder for remote production pipelines</p>
      </header>

      <div className="create-form">
        <button className="btn btn-primary btn-lg" onClick={handleCreate}>+ New Workflow</button>
      </div>

      {loading ? (
        <p className="loading-text">Loading...</p>
      ) : workflows.length === 0 ? (
        <p className="empty-text">No workflows yet. Click "New Workflow" to get started.</p>
      ) : (
        <div className="workflow-grid">
          {workflows.map((wf) => (
            <div key={wf._id} className="workflow-card" onClick={() => onOpen(wf._id)}>
              <div className="card-header">
                <h3>{wf.name}</h3>
                <span className={`status-badge status-${wf.status}`}>{wf.status}</span>
              </div>
              <p className="card-desc">{wf.description || 'No description'}</p>
              <div className="card-footer">
                <span>{wf.nodes.length} nodes · {wf.edges.length} edges</span>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => { e.stopPropagation(); handleDelete(wf._id); }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
