// CommonJS on purpose: the renderer is sandboxed, and a sandboxed preload
// cannot be an ES module - even though the rest of the project is.
//
// Only exists inside the Electron window. A phone loading the same app over
// Tailscale never gets `window.kioskShell`, so it cannot close the wall display.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kioskShell', {
  minimize: () => ipcRenderer.invoke('kiosk:minimize'),
  restart: () => ipcRenderer.invoke('kiosk:restart'),
  close: () => ipcRenderer.invoke('kiosk:close'),
});
