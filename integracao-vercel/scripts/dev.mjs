import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import handler from '../api/moodle.js';
const root = resolve('public');
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:3000');
  if (url.pathname === '/api/moodle') {
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 8192) { res.writeHead(413); res.end(); return; } }
    req.body = body;
    return handler(req, res);
  }
  let path;
  try { path = resolve(root, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : '')); } catch { res.writeHead(400); res.end(); return; }
  if (!path.startsWith(root + '/')) { res.writeHead(403); res.end(); return; }
  try {
    const bytes = await readFile(path);
    res.setHeader('Content-Type', ({ '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png' })[extname(path)] || 'application/octet-stream');
    res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
}).listen(3000, '127.0.0.1', () => console.log('Prévia local: http://127.0.0.1:3000. A API exige origem HTTPS configurada; use a implantação Vercel para a conexão real.'));
