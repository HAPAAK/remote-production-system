import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Dashboard from './components/Dashboard';
import WorkflowEditor from './components/WorkflowEditor';

export default function App() {
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);

  return (
    <>
      <Toaster position="top-right" />
      {activeWorkflowId ? (
        <WorkflowEditor
          key={activeWorkflowId}
          workflowId={activeWorkflowId}
          onBack={() => setActiveWorkflowId(null)}
        />
      ) : (
        <Dashboard onOpen={setActiveWorkflowId} />
      )}
    </>
  );
}

