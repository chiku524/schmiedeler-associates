/**
 * Minimal static dev server (no .bin path issues with special chars in dir name).
 * Run: node scripts/serve.js  or  npm run dev
 *
 * Strips query/hash from URLs so cache-busted assets (e.g. css/style.css?v=2)
 * resolve to the real file on disk. Uses pathname-only so path.join(ROOT, ...)
 * is correct on all platforms.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT_MIN = 3000;
const PORT_MAX = 3010;
const ROOT = path.join(__dirname, '..');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
};

function createServer() {
  return http.createServer((req, res) => {
    // Strip query string and hash so "css/style.css?v=2" resolves to the real file
    const raw = req.url.split('?')[0].split('#')[0] || '/';
    const pathname = raw.replace(/^\/+/, '') || 'index.html';
    let file = path.join(ROOT, path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, ''));
    const ext = path.extname(file);
    const mime = MIME[ext] || 'application/octet-stream';

    fs.readFile(file, (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
        } else {
          res.writeHead(500);
          res.end('Server error');
        }
        return;
      }
      res.writeHead(200, { 'Content-Type': mime });
      res.end(data);
    });
  });
}

function tryListen(port) {
  if (port > PORT_MAX) {
    console.error('No available port between', PORT_MIN, 'and', PORT_MAX);
    process.exit(1);
  }
  const server = createServer();
  server.listen(port, () => {
    console.log(`Dev server: http://localhost:${port}`);
  });
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      tryListen(port + 1);
    } else {
      console.error(err);
      process.exit(1);
    }
  });
}
tryListen(PORT_MIN);
