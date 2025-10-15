const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

/**
 * Basic static file server for files under PUBLIC_DIR.
 * Falls back to index.html for the root url.
 */
function serveStatic(req, res) {
  const requestedPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' });
      res.end(err.code === 'ENOENT' ? 'Not Found' : 'Internal Server Error');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
    res.end(data);
  });
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    default:
      return 'text/plain; charset=utf-8';
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function handleCalculate(req, res) {
  try {
    const body = await parseBody(req);
    const payload = JSON.parse(body || '{}');
    const { operation, left, right } = payload;

    const leftNumber = Number(left);
    const rightNumber = Number(right);

    if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Both operands must be numbers.' }));
      return;
    }

    let result;
    if (operation === 'add') {
      result = leftNumber + rightNumber;
    } else if (operation === 'subtract') {
      result = leftNumber - rightNumber;
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Only add and subtract operations are supported.' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ result }));
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid request payload.' }));
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/calculate') {
    handleCalculate(req, res);
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Calculator app listening on http://localhost:${PORT}`);
});
