import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1920,          // fallback size
    height: 1080,
    fullscreen: false,
    kiosk: false,         // ← important so taskbar stays visible
    frame: false,         // removes title bar for clean kiosk look
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load your built React app
  win.loadFile(path.join(__dirname, 'dist/index.html'));

  // Maximize the window (this is the correct way)
  win.maximize();

  // Optional: keep app on top but still allow taskbar
  win.setAlwaysOnTop(false);

  // Prevent accidental close (remove this line later if you want normal closing)
  win.on('close', (e: Electron.Event) => {
    e.preventDefault();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});