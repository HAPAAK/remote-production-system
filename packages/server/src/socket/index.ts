import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { SocketEvents } from '@rps/shared';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    socket.on(SocketEvents.JoinWorkflow, (workflowId: string) => {
      socket.join(workflowId);
      console.log(`[socket] ${socket.id} joined room ${workflowId}`);
    });

    socket.on(SocketEvents.LeaveWorkflow, (workflowId: string) => {
      socket.leave(workflowId);
      console.log(`[socket] ${socket.id} left room ${workflowId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized. Call initSocket first.');
  return io;
}

