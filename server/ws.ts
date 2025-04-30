import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { WebSocket } from 'ws';

// Create WebSocket server with specific path
export const attachWS = (server: Server) => {
  const wss = new WebSocketServer({ 
    server, 
    path: '/ws'
  });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  
  // Broadcast event to all connected clients
  return {
    push: (ev: string, data: any) => {
      const message = JSON.stringify({ ev, data });
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  };
};

// Create a global instance for use in other modules
let pushFn: (ev: string, data: any) => void = () => {};

// Export a function to broadcast events
export const push = (ev: string, data: any) => {
  pushFn(ev, data);
};

// Replace the global push function with the actual implementation
export const setPush = (fn: typeof pushFn) => {
  pushFn = fn;
};