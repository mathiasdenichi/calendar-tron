import { app, BrowserWindow, globalShortcut } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './kiosk-server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');

// The renderer is served over http://localhost:5173 rather than loaded from
// disk with loadFile(), for two reasons:
//
//   1. Chromium blocks `<script type="module">` over file:// (opaque origin,
//      CORS), and Vite always emits a module script. loadFile() white-screens.
//   2. localStorage and IndexedDB are partitioned by origin. This is the same
//      origin the Vite dev server used, so the photo cache and the per-day
//      calendar photos — which exist nowhere else — survive the switch to
//      production. Changing scheme, host, or port silently orphans all of it.
//
// kiosk-server.js is a static file server only; there is no dev server, no HMR,
// and no second Node process. Vite's output is a single minified bundle.
const PORT = Number(process.env.KIOSK_PORT) || 5173;

// Default binds loopback only: nothing outside this machine can reach it, which
// is what you want when Tailscale (or any reverse proxy) fronts it locally.
// Set KIOSK_HOST=0.0.0.0 to also answer on the LAN — note the app has no auth.
//
// 'localhost' rather than '127.0.0.1' on purpose: the window loads
// http://localhost:5173, so Node and Chromium must resolve it the same way or
// the kiosk hits a connection refused on an IPv6-first machine.
const HOST = process.env.KIOSK_HOST || 'localhost';

// Set KIOSK_DEV_URL to point at a running `npm run dev` instead of dist/.
const devUrl = process.env.KIOSK_DEV_URL;

let win = null;
let quitting = false;

function createWindow(url) {
  win = new BrowserWindow({
    width: 1920,
    height: 1080,
    kiosk: !devUrl,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#030712',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // The kiosk must keep ticking even if the window is ever occluded —
      // otherwise Chromium throttles timers and the clock and slideshow stall.
      backgroundThrottling: false,
    },
  });

  // Avoids a white flash before the first paint.
  win.once('ready-to-show', () => win.show());

  win.loadURL(url);

  // Swallow stray close requests so the kiosk can't be dismissed by accident,
  // but let a deliberate quit through.
  win.on('close', (e) => {
    if (!quitting) e.preventDefault();
  });

  // Nobody is watching this screen, so recover from a dead renderer on our own.
  win.webContents.on('render-process-gone', () => {
    if (!quitting) win.reload();
  });
  win.webContents.on('unresponsive', () => {
    if (!quitting) win.reload();
  });
}

app.whenReady().then(async () => {
  let url = devUrl;

  if (!url) {
    if (!fs.existsSync(path.join(DIST, 'index.html'))) {
      throw new Error('dist/index.html is missing — run `npm run build` first');
    }
    await serveStatic({ root: DIST, port: PORT, host: HOST });
    url = `http://${HOST}:${PORT}/`;
  }

  createWindow(url);

  // Escape hatch — without this the close handler above makes the app
  // unquittable and you'd need Task Manager every time.
  globalShortcut.register('Control+Shift+Q', () => {
    quitting = true;
    app.quit();
  });
}).catch((err) => {
  // Most likely EADDRINUSE because a previous kiosk (or `npm run dev`) still
  // holds the port. Exit loudly rather than lingering with no window — the
  // supervisor notices the exit and retries.
  console.error('[kiosk] failed to start:', err.message);
  quitting = true;
  app.exit(1);
});

app.on('before-quit', () => {
  quitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  app.quit();
});
