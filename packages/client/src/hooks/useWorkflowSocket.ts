import { useEffect, useRef } from 'react';
import { getSocket } from '../services/socket';
import { SocketEvents, type NodeStatePayload, type WorkflowStatePayload } from '../types';

interface Params {
  workflowId: string | null;
  onNodeStateChanged: (payload: NodeStatePayload) => void;
  onWorkflowStateChanged: (payload: WorkflowStatePayload) => void;
}

export function useWorkflowSocket({ workflowId, onNodeStateChanged, onWorkflowStateChanged }: Params) {
  const nodeRef = useRef(onNodeStateChanged);
  const wfRef = useRef(onWorkflowStateChanged);
  nodeRef.current = onNodeStateChanged;
  wfRef.current = onWorkflowStateChanged;

  useEffect(() => {
    if (!workflowId) return;

    const socket = getSocket();
    socket.emit(SocketEvents.JoinWorkflow, workflowId);

    const handleNode = (p: NodeStatePayload) => nodeRef.current(p);
    const handleWf = (p: WorkflowStatePayload) => wfRef.current(p);

    socket.on(SocketEvents.NodeStateChanged, handleNode);
    socket.on(SocketEvents.WorkflowStateChanged, handleWf);

    return () => {
      socket.emit(SocketEvents.LeaveWorkflow, workflowId);
      socket.off(SocketEvents.NodeStateChanged, handleNode);
      socket.off(SocketEvents.WorkflowStateChanged, handleWf);
    };
  }, [workflowId]);
}

