import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(HERE, 'kiosk.config.json');

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

/** Endpoint the UI calls to learn the URL a phone should visit. */
export const INFO_PATH = '/__kiosk/info';

const INFO_TTL_MS = 60_000;
const INFO_FAIL_TTL_MS = 10_000;
let infoCache = { at: 0, value: null };

let cachedConfig = null;

/** Committed config, so the address ships with the code rather than being set by hand. */
function readConfig() {
  if (cachedConfig) return cachedConfig;
  try {
    cachedConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    cachedConfig = {};
  }
  return cachedConfig;
}

function configuredUrl() {
  // Env wins so a one-off can override without editing a tracked file.
  const value = process.env['KIOSK_PUBLIC_URL'] || readConfig().publicUrl;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function tailscaleCandidates() {
  // Explicit override wins: set TAILSCALE_EXE when the CLI lives somewhere
  // unusual (Microsoft Store builds, Chocolatey, a custom install dir).
  const override = process.env['TAILSCALE_EXE'];
  if (override) return [override];

  if (process.platform === 'win32') {
    // execFile does NOT apply PATHEXT, so a bare 'tailscale' fails on Windows
    // even when tailscale.exe is on PATH. Always name the extension.
    const dirs = [
      process.env['ProgramFiles'] || 'C:\\Program Files',
      process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
      process.env['LOCALAPPDATA'] || '',
    ].filter(Boolean);
    const extra = [
      path.join(process.env['ProgramData'] || 'C:\\ProgramData', 'chocolatey', 'bin', 'tailscale.exe'),
    ];
    return [
      'tailscale.exe',
      ...dirs.map((dir) => path.join(dir, 'Tailscale', 'tailscale.exe')),
      ...extra,
    ];
  }
  return ['tailscale', '/usr/local/bin/tailscale', '/opt/homebrew/bin/tailscale'];
}

function execTailscale(exe, args) {
  return new Promise((resolve) => {
    execFile(exe, args, { timeout: 5000, windowsHide: true }, (err, stdout) => {
      resolve(err ? null : String(stdout));
    });
  });
}

/**
 * The renderer can't work this out for itself: on the kiosk `location.hostname`
 * is always `localhost`, which is precisely the address a phone cannot use. So
 * the host process asks Tailscale and hands the answer down.
 */
/** Ask the Tailscale CLI where we are and whether the port is being served. */
async function detectViaCli(port) {
  const tried = [];

  for (const exe of tailscaleCandidates()) {
    const statusRaw = await execTailscale(exe, ['status', '--json']);
    if (!statusRaw) {
      tried.push(exe);
      continue;
    }

    let dnsName = null;
    try {
      dnsName = JSON.parse(statusRaw)?.Self?.DNSName ?? null;
    } catch {
      // not JSON - treat like a miss but the CLI clearly ran
    }

    // `serve status` mentioning the port is what makes the URL actually work.
    const serveRaw = await execTailscale(exe, ['serve', 'status']);
    const serving = typeof serveRaw === 'string' && serveRaw.includes(`:${port}`);

    if (!dnsName) {
      return {
        cliRan: true,
        url: null,
        serving,
        detail: 'Tailscale is installed but reported no device name - is it logged in and running?',
      };
    }

    return { cliRan: true, url: `https://${dnsName.replace(/\.$/, '')}`, serving, detail: null };
  }

  return {
    cliRan: false,
    url: null,
    serving: false,
    detail:
      `Could not run the tailscale CLI. Tried: ${tried.join(', ')}. ` +
      'Set publicUrl in kiosk.config.json, or TAILSCALE_EXE to the CLI path.',
  };
}

async function readKioskInfo(port) {
  const pinned = configuredUrl();
  const cli = await detectViaCli(port);

  if (pinned) {
    return {
      url: pinned.replace(/\/+$/, ''),
      // A configured URL fixes the address but says nothing about whether
      // `tailscale serve` is running. Keep checking when the CLI is reachable,
      // so "set but not actually served" still surfaces as a warning.
      serving: cli.cliRan ? cli.serving : true,
      detail: null,
    };
  }

  return { url: cli.url, serving: cli.serving, detail: cli.detail };
}

async function kioskInfo(port) {
  const now = Date.now();
  if (infoCache.value) {
    const ttl = infoCache.value.url ? INFO_TTL_MS : INFO_FAIL_TTL_MS;
    if (now - infoCache.at < ttl) return infoCache.value;
  }

  const value = await readKioskInfo(port).catch((err) => ({
    url: null,
    serving: false,
    detail: `Lookup failed: ${err?.message ?? err}`,
  }));
  infoCache = { at: now, value };
  return value;
}

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

      // Must come before the SPA fallback, or it would serve index.html.
      if (pathname === INFO_PATH) {
        kioskInfo(port).then((info) => {
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          });
          res.end(JSON.stringify(info));
        });
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
