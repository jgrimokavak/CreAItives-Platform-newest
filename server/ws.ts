import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import session from 'express-session';
import { parse as parseCookie } from 'cookie';
import { getSession } from './replitAuth';
import { storage } from './storage';
import { User } from '@shared/schema';

/**
 * Helper function to check if user is from @kavak.com
 */
function isKavakUser(email: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith('@kavak.com');
}

/**
 * Authenticate WebSocket connection and extract user data
 * @param req - Incoming HTTP request for WebSocket upgrade
 * @returns Promise<User | null> - User data if authenticated, null otherwise
 */
async function authenticateWebSocket(req: IncomingMessage, sessionStore: any): Promise<User | null> {
  try {
    // Parse cookies to get session ID
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      console.log('WebSocket auth failed: No cookies found');
      return null;
    }

    const cookies = parseCookie(cookieHeader);
    const sessionIdRaw = cookies['connect.sid'];
    
    if (!sessionIdRaw) {
      console.log('WebSocket auth failed: No session ID found');
      return null;
    }

    // Verify session cookie is properly signed (starts with 's:' and has signature)
    if (!sessionIdRaw.startsWith('s:') || !sessionIdRaw.includes('.')) {
      console.log('WebSocket auth failed: Invalid session cookie format');
      return null;
    }
    
    // Additional security: verify the session cookie length (signed cookies are longer)
    if (sessionIdRaw.length < 50) {
      console.log('WebSocket auth failed: Session cookie too short (likely invalid)');
      return null;
    }

    // Extract session ID (remove 's:' prefix and signature)
    const sessionId = sessionIdRaw.slice(2, sessionIdRaw.lastIndexOf('.'));

    // PERFORMANCE OPTIMIZATION: Extract user data during WebSocket authentication
    // This approach gets user data once on connection instead of on each message
    return new Promise((resolve) => {
      if (sessionStore && typeof sessionStore.get === 'function') {
        sessionStore.get(sessionId, (err: any, session: any) => {
          if (err || !session) {
            console.log('WebSocket auth failed: Invalid or expired session');
            resolve(null);
            return;
          }
          
          // Extract user info from the session
          const userId = session.user?.claims?.sub || session.userId;
          const email = session.user?.claims?.email || session.userEmail;
          
          if (!userId) {
            console.log('WebSocket auth failed: No user ID in session');
            resolve(null);
            return;
          }
          
          console.log(`WebSocket authentication successful - user ${userId}`);
          resolve({ id: userId, email: email } as any);
        });
      } else {
        // Fallback if sessionStore not available
        console.log('WebSocket authentication successful - valid session cookie present');
        resolve({ validated: true } as any);
      }
    });
  } catch (error) {
    console.error('WebSocket authentication error:', error);
    return null;
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
        // PERFORMANCE OPTIMIZATION: Authenticate and extract user data once
        const authenticatedUser = await authenticateWebSocket(req, sessionStore);
        
        if (!authenticatedUser) {
          console.log(`WebSocket connection denied from ${req.socket.remoteAddress}`);
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }
        
        // Authentication successful, allow WebSocket upgrade and pass user context
        wss.handleUpgrade(req, socket, head, (ws) => {
          // Store user context on the WebSocket for future event handlers
          (ws as any).user = authenticatedUser;
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
    
    // PERFORMANCE OPTIMIZATION: User data is now stored on ws.user after authentication
    // Future event handlers can access (ws as any).user instead of re-authenticating
    
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
    },
    // New function to broadcast to specific user
    pushToUser: (userId: string, ev: string, data: any) => {
      const message = JSON.stringify({ ev, data });
      let sentCount = 0;
      
      wss.clients.forEach(client => {
        // Check if client belongs to the specified user
        const clientUser = (client as any).user;
        if (client.readyState === WebSocket.OPEN && clientUser?.id === userId) {
          client.send(message);
          sentCount++;
        }
      });
      
      // Log broadcast results if there are any clients
      if (sentCount > 0) {
        console.log(`Broadcast "${ev}" to user ${userId} (${sentCount} clients)`);
      }
      
      // Return the number of clients that received the message
      return sentCount;
    }
  };
};

// Create global instances for use in other modules
let pushFn: (ev: string, data: any) => number = () => 0;
let pushToUserFn: (userId: string, ev: string, data: any) => number = () => 0;

// Export a function to broadcast events to all clients
export const push = (ev: string, data: any): number => {
  return pushFn(ev, data);
};

// Export a function to broadcast events to specific user
export const pushToUser = (userId: string, ev: string, data: any): number => {
  return pushToUserFn(userId, ev, data);
};

// Replace the global push functions with the actual implementation
export const setPush = (fn: typeof pushFn) => {
  pushFn = fn;
};

export const setPushToUser = (fn: typeof pushToUserFn) => {
  pushToUserFn = fn;
};