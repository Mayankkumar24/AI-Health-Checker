import 'dotenv/config';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { handleConnection } from './ws/callHandler.js';

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('[server] client connected');
  handleConnection(ws);
  ws.on('close', () => console.log('[server] client disconnected'));
});

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
