// Preload script for Electron security
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  credentials: Object.freeze({
    capabilities: () => ipcRenderer.invoke('credentials:capabilities'),
    get: (scope) => ipcRenderer.invoke('credentials:get', scope),
    set: (scope, credentials, options) => ipcRenderer.invoke('credentials:set', scope, credentials, options),
    delete: (scope) => ipcRenderer.invoke('credentials:delete', scope),
  }),
});
