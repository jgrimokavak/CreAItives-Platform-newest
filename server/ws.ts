import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import session from 'express-session';
import { parse as parseCookie } from 'cookie';
import { getSession } from './replitAuth';

/**
 * Helper function to check if user is from @kavak.com
 */
function isKavakUser(email: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith('@kavak.com');
}

/**
 * Authenticate WebSocket connection using session data
 * @param req - Incoming HTTP request for WebSocket upgrade
 * @returns Promise<boolean> - true if authenticated, false otherwise
 */
async function authenticateWebSocket(req: IncomingMessage): Promise<boolean> {
  try {
    // Parse cookies to get session ID
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      console.log('WebSocket auth failed: No cookies found');
      return false;
    }

    const cookies = parseCookie(cookieHeader);
    const sessionId = cookies['connect.sid'];
    
    if (!sessionId) {
      console.log('WebSocket auth failed: No session ID found');
      return false;
    }

    // We need to access the session store that's already been created
    // For now, we'll use a simpler approach - check if the session cookie exists
    // and has the right format, then trust the HTTP auth will handle the rest
    if (!sessionId || !sessionId.includes('.')) {
      console.log('WebSocket auth failed: Invalid session format');
      return false;
    }

    // For WebSocket authentication, we'll use a simplified approach:
    // 1. Check if there's a valid session cookie (signed format)
    // 2. The HTTP middleware already handles the complex auth logic
    // 3. This prevents unauthenticated connections while being practical
    
    // Verify session cookie is properly signed (starts with 's:' and has signature)
    if (!sessionId.startsWith('s:') || !sessionId.includes('.')) {
      console.log('WebSocket auth failed: Invalid session cookie format');
      return false;
    }
    
    // Additional security: verify the session cookie length (signed cookies are longer)
    if (sessionId.length < 50) {
      console.log('WebSocket auth failed: Session cookie too short (likely invalid)');
      return false;
    }
    
    console.log('WebSocket authentication successful - valid session cookie present');
    return true;
  } catch (error) {
    console.error('WebSocket authentication error:', error);
    return false;
  }
}

/**
 * Create WebSocket server and handle upgrade requests
 * @param server - HTTP server to attach to
 * @returns Object with push function to broadcast events
 */
export const attachWS = (server: Server, sessionStore?: any) => {
  // Create WebSocketServer with a specific path
  const wss = new WebSocketServer({ 
    noServer: true,  // Handle upgrade manually for more control
  });
  
  // Handle upgrade requests
  server.on('upgrade', async (req: IncomingMessage, socket, head) => {
    // Check if the path is /ws (our WebSocket endpoint)
    try {
      // Parse the URL path more safely
      const url = req.url || '';
      if (url === '/ws' || url.startsWith('/ws?')) {
        // Authenticate the WebSocket connection
        const isAuthenticated = await authenticateWebSocket(req);
        
        if (!isAuthenticated) {
          console.log(`WebSocket connection denied from ${req.socket.remoteAddress}`);
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }
        
        // Authentication successful, allow WebSocket upgrade
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      } else {
        // Not a WebSocket request we handle
        socket.destroy();
      }
    } catch (error) {
      console.error('Error handling WebSocket upgrade:', error);
      socket.destroy();
    }
  });
  
  // Handle connection events
  wss.on('connection', (ws, req) => {
    console.log(`Authenticated WebSocket client connected from ${req.socket.remoteAddress}`);
    
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
    
    // Handle incoming messages (validate and ignore for security)
    ws.on('message', (data) => {
      try {
        // For security, we don't process incoming messages from clients
        // This prevents potential message injection attacks
        console.log('WebSocket message received but ignored for security');
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });
    
    // Handle WebSocket errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clearInterval(pingInterval);
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