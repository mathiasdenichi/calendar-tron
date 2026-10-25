import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './kiosk-server.js';
import { createKioskApi } from './kiosk-api.js';

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

// scripts/kiosk.ps1 sets this. Under the supervisor, any exit is followed by a
// relaunch within ~5s, so Restart only has to exit and Close has to tell it to
// stand down instead. Keep CLOSE_EXIT_CODE in sync with $CloseExitCode there.
const supervised = process.env.KIOSK_SUPERVISED === '1';
const CLOSE_EXIT_CODE = 64;

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
      preload: path.join(__dirname, 'electron-preload.cjs'),
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
    await serveStatic({ root: DIST, port: PORT, host: HOST, api: createKioskApi() });
    url = `http://${HOST}:${PORT}/`;
  }

  createWindow(url);

  // Escape hatch — without this the close handler above makes the app
  // unquittable and you'd need Task Manager every time.
  globalShortcut.register('Control+Shift+Q', () => {
    quitting = true;
    app.quit();
  });

  // Menu > Minimize, for reaching the desktop over remote access, where the
  // taskbar is hidden behind the fullscreen window. A kiosk-mode window
  // won't minimize, so drop out of kiosk mode first and go back into it as soon
  // as the window is restored. The process stays up, so the supervisor leaves
  // it alone.
  ipcMain.handle('kiosk:minimize', () => {
    if (!win) return;
    if (win.isKiosk()) {
      win.setKiosk(false);
      win.once('restore', () => win.setKiosk(true));
    }
    win.minimize();
  });

  // Menu > Restart. Unsupervised there is nobody to bring us back, so relaunch
  // ourselves; supervised, relaunching too would race the supervisor for the port.
  ipcMain.handle('kiosk:restart', () => {
    quitting = true;
    if (!supervised) app.relaunch();
    app.exit(0);
  });

  // Menu > Close. The distinct exit code is what stops the supervisor from
  // relaunching - a plain exit would be back on screen in five seconds.
  ipcMain.handle('kiosk:close', () => {
    quitting = true;
    app.exit(supervised ? CLOSE_EXIT_CODE : 0);
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
