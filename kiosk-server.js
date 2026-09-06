import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  // Browsers reject a manifest served as octet-stream
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * Serves a built Vite bundle over http so the renderer gets a real origin.
 *
 * Static files only — no dev server, no HMR, no watching. See electron.js for
 * why the app is not loaded straight off disk with loadFile().
 *
 * @param {{ root: string, port?: number, host?: string }} options
 * @returns {Promise<import('node:http').Server>}
 */
export function serveStatic({ root, port = 5173, host = 'localhost' }) {
  const DIST = path.resolve(root);

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let pathname;
      try {
        pathname = decodeURIComponent(new URL(req.url, `http://${host}`).pathname);
      } catch {
        res.writeHead(400).end('Bad request');
        return;
      }

      // Resolve inside the root and reject anything that escapes it.
      const resolved = path.resolve(path.join(DIST, pathname));
      if (resolved !== DIST && !resolved.startsWith(DIST + path.sep)) {
        res.writeHead(403).end('Forbidden');
        return;
      }

      let file;
      try {
        file = fs.statSync(resolved).isFile() ? resolved : path.join(DIST, 'index.html');
      } catch {
        file = path.join(DIST, 'index.html');
      }

      fs.readFile(file, (err, body) => {
        if (err) {
          res.writeHead(404).end('Not found');
          return;
        }
        res.writeHead(200, {
          'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
        });
        res.end(body);
      });
    });

    server.on('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}
