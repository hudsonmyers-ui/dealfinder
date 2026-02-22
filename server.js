import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { GameStore } from './src/store.js';

const store = new GameStore();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = join(process.cwd(), 'public');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'POST' && url.pathname === '/api/session/start') {
      const body = await parseBody(req);
      const playerId = body.playerId || 'demo-player';
      const result = store.startSession(playerId);
      return json(res, 200, result);
    }

    if (req.method === 'POST' && url.pathname.startsWith('/api/session/') && url.pathname.endsWith('/event')) {
      const sessionId = url.pathname.split('/')[3];
      const body = await parseBody(req);
      const result = store.submitEvent(sessionId, {
        type: body.type,
        timestamp: Date.now(),
        challengeOutcome: body.challengeOutcome
      });
      return json(res, 200, result);
    }

    if (req.method === 'GET' && url.pathname === '/api/leaderboard') {
      return json(res, 200, store.getLeaderboard(url.searchParams.get('scope') || 'global'));
    }

    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const fullPath = join(PUBLIC_DIR, path);
    const data = await readFile(fullPath);
    const ext = extname(fullPath);
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    res.end(data);
  } catch (error) {
    if (String(error.message).includes('ENOENT')) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    json(res, 400, { error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Hoops AI app listening on http://localhost:${PORT}`);
});
