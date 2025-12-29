// Preload script for Electron security
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Example: Add methods here if needed for native functionality
  // minimize: () => ipcRenderer.invoke('minimize-window'),
  // maximize: () => ipcRenderer.invoke('maximize-window'),
  // close: () => ipcRenderer.invoke('close-window'),

  // Platform info
  platform: process.platform,

  // Version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

// Remove this if you don't need it
console.log('Preload script loaded successfully');