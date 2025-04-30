import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { Server } from 'http';

const wss = new WebSocketServer({ noServer: true });

export const push = (ev: string, data: any) =>
  wss.clients.forEach(c => {
    if (c.readyState === 1) { // WebSocket.OPEN
      c.send(JSON.stringify({ ev, data }));
    }
  });

export const attachWS = (server: Server) => {
  server.on('upgrade', (req, sock, head) => {
    const token = req.headers['sec-websocket-protocol'] as string;
    try {
      jwt.verify(token, process.env.JWT_SECRET!);
      wss.handleUpgrade(req, sock, head, ws => wss.emit('connection', ws, req));
    } catch {
      sock.destroy();
    }
  });
};