/**
 * Runtime capability detection for the three build targets:
 * web (browser), Capacitor (Android/iOS), Electron (desktop).
 * Always prefer these guards over bundler-level conditionals so the
 * same bundle keeps working across targets.
 */

export interface ElectronBridge {
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
  saveFile: (options: { path: string; data: ArrayBuffer }) => Promise<{ ok: boolean; path?: string; error?: string }>;
  getDefaultDownloadPath: () => Promise<string>;
}

export function isCapacitor(): boolean {
  return typeof window !== 'undefined' && !!window.Capacitor;
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && typeof window.electronAPI?.saveFile === 'function';
}

export function isWeb(): boolean {
  return !isCapacitor() && !isElectron();
}

export function getElectronBridge(): ElectronBridge | null {
  return isElectron() ? window.electronAPI : null;
}
