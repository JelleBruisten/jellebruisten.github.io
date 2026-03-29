import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const DIST = 'dist/jelle-bruisten/browser';
const PORT = process.env.PORT || 9222;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.glsl': 'text/plain; charset=utf-8',
  '.wgsl': 'text/plain; charset=utf-8',
  '.xml':  'application/xml; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
};

// Text types that benefit from compression
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.glsl', '.wgsl', '.xml', '.txt']);

// Mimic GitHub Pages caching:
// - HTML: short cache + must-revalidate (fresh deploys show immediately)
// - Hashed assets (chunk-ABC123.js): immutable, 1 year
// - Fonts/images/shaders: long cache (these rarely change)
// - SW manifest (ngsw.json): no-cache (must always be fresh)
function cacheControl(filePath) {
  const ext = extname(filePath);
  const name = filePath.split(/[/\\]/).pop() || '';

  // Service worker files must always be fresh
  if (name === 'ngsw.json' || name === 'ngsw-worker.js') return 'no-cache';
  // HTML pages: short cache with revalidation
  if (ext === '.html') return 'public, max-age=600, must-revalidate';
  // Hashed assets (e.g. chunk-TNEZQDCB.js, main-RKZCMQZH.js, styles-VEO4ZVKV.css)
  if (/[.-][A-Z0-9]{6,}\./i.test(name)) return 'public, max-age=31536000, immutable';
  // Fonts: very long cache (content-addressed by nature)
  if (ext === '.woff2' || ext === '.woff') return 'public, max-age=31536000, immutable';
  // Everything else (shaders, images, json, favicon, etc.)
  return 'public, max-age=86400';
}

function compress(buf, acceptEncoding, ext) {
  if (!COMPRESSIBLE.has(ext)) return { buf, encoding: null };
  if (acceptEncoding.includes('br'))   return { buf: brotliCompressSync(buf), encoding: 'br' };
  if (acceptEncoding.includes('gzip')) return { buf: gzipSync(buf), encoding: 'gzip' };
  return { buf, encoding: null };
}

function resolve(urlPath) {
  // Try exact file, then index.html for directories (prerendered routes)
  let filePath = join(DIST, urlPath);
  if (existsSync(filePath) && statSync(filePath).isFile()) return filePath;
  filePath = join(DIST, urlPath, 'index.html');
  if (existsSync(filePath)) return filePath;
  // SPA fallback
  return join(DIST, 'index.html');
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const filePath = resolve(url.pathname);
  const ext = extname(filePath);

  let body;
  try {
    body = readFileSync(filePath);
  } catch {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const accept = req.headers['accept-encoding'] || '';
  const { buf, encoding } = compress(body, accept, ext);

  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': cacheControl(filePath),
    'Vary': 'Accept-Encoding',
  };
  if (encoding) headers['Content-Encoding'] = encoding;

  res.writeHead(200, headers);
  res.end(buf);
});

server.listen(PORT, () => {
  console.log(`Lighthouse server ready on http://localhost:${PORT}`);
});
