import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';

/**
 * Create WebSocket server and handle upgrade requests
 * @param server - HTTP server to attach to
 * @returns Object with push function to broadcast events
 */
export const attachWS = (server: Server) => {
  // Create WebSocketServer with a specific path
  const wss = new WebSocketServer({ 
    noServer: true,  // Handle upgrade manually for more control
  });
  
  // Handle upgrade requests
  server.on('upgrade', (req: IncomingMessage, socket, head) => {
    // Check if the path is /ws (our WebSocket endpoint)
    if (req.url?.startsWith('/ws')) {
      // Temporarily disabled JWT verification until auth is implemented
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });
  
  // Handle connection events
  wss.on('connection', (ws, req) => {
    console.log(`WebSocket client connected from ${req.socket.remoteAddress}`);
    
    // Ping the client every 30 seconds to keep the connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);
    
    // Handle close events and clean up
    ws.on('close', (code, reason) => {
      console.log(`WebSocket client disconnected: ${code} ${reason}`);
      clearInterval(pingInterval);
    });
    
    // Handle pong responses to track connection health
    ws.on('pong', () => {
      // Connection is still alive
    });
  });
  
  // Return an object with a function to broadcast events to all clients
  return {
    push: (ev: string, data: any) => {
      const message = JSON.stringify({ ev, data });
      let sentCount = 0;
      
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
          sentCount++;
        }
      });
      
      // Log broadcast results if there are any clients
      if (sentCount > 0) {
        console.log(`Broadcast "${ev}" to ${sentCount} clients`);
      }
      
      // Return the number of clients that received the message
      return sentCount;
    }
  };
};

// Create a global instance for use in other modules
let pushFn: (ev: string, data: any) => number = () => 0;

// Export a function to broadcast events
export const push = (ev: string, data: any): number => {
  return pushFn(ev, data);
};

// Replace the global push function with the actual implementation
export const setPush = (fn: typeof pushFn) => {
  pushFn = fn;
};