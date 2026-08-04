// Preload script for Electron security
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,

  // Version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },

  // Persist a file through the main process (native fs).
  saveFile: (options) => ipcRenderer.invoke('save-file', options),

  // Resolve the system downloads directory.
  getDefaultDownloadPath: () => ipcRenderer.invoke('get-default-download-path')
});
