import { isCapacitor, isElectron, getElectronBridge } from '../platform';

export interface DownloadProgress {
  received: number;
  total: number;
  percent: number;
}

export interface DownloadOptions {
  /** Target filename (may contain a subdirectory on desktop). */
  filename: string;
  /** Extra directory segment used by Capacitor (subfolder under the app
   * download dir) and Electron (relative to the configured path). */
  directory?: string;
  onProgress?: (progress: DownloadProgress) => void;
}

export class DownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DownloadError';
  }
}

/** Strip anything that could escape the download directory. */
export function sanitizeFilename(filename: string): string {
  const base = filename.replace(/\\/g, '/').split('/').pop() || 'file';
  return base.replace(/^\.+$/, 'file').slice(0, 255);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(blob);
  }).then((dataUrl) => dataUrl.split(',')[1] ?? '');
}

/* ---------- Web: StreamSaver (service worker) with blob fallback ---------- */

async function saveWithStreamSaver(url: string, options: DownloadOptions): Promise<void> {
  const streamSaver = (await import('streamsaver')).default;
  streamSaver.mitm = 'mitm.html';

  const response = await fetch(url);
  if (!response.ok) throw new DownloadError(`Download failed: HTTP ${response.status}`);
  if (!response.body) throw new DownloadError('Download response has no body');

  const total = Number(response.headers.get('content-length')) || 0;
  const fileStream = streamSaver.createWriteStream(options.filename, total > 0 ? { size: total } : undefined);

  const reader = response.body.getReader();
  const writer = fileStream.getWriter();
  let received = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      await writer.write(value);
      options.onProgress?.({
        received,
        total,
        percent: total > 0 ? Math.round((received / total) * 100) : 0,
      });
    }
    await writer.close();
  } catch (error) {
    try {
      await writer.abort(error);
    } catch {
      // Writer already aborted.
    }
    throw error;
  }
}

/** Classic anchor+blob download used when service workers are unavailable. */
async function saveWithBlob(url: string, options: DownloadOptions): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new DownloadError(`Download failed: HTTP ${response.status}`);

  const blob = await response.blob();
  options.onProgress?.({ received: blob.size, total: blob.size, percent: 100 });

  const blobUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = options.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }
}

/* ---------- Capacitor: Filesystem plugin (Documents/e6client) ---------- */

function capacitorPath(directory: string | undefined, filename: string): string {
  const segment = (directory || 'e6client').replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = segment.split('/').filter((part) => part && part !== '..');
  return [...parts, sanitizeFilename(filename)].join('/');
}

async function saveWithCapacitor(url: string, options: DownloadOptions): Promise<void> {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');

  const response = await fetch(url);
  if (!response.ok) throw new DownloadError(`Download failed: HTTP ${response.status}`);

  const blob = await response.blob();
  options.onProgress?.({ received: blob.size, total: blob.size, percent: 100 });

  const data = await blobToBase64(blob);
  const path = capacitorPath(options.directory, options.filename);
  await Filesystem.writeFile({
    path,
    data,
    directory: Directory.Documents,
    recursive: true,
  });
}

/* ---------- Electron: native fs through the preload bridge ---------- */

async function saveWithElectron(url: string, options: DownloadOptions): Promise<void> {
  const bridge = getElectronBridge();
  if (!bridge) throw new DownloadError('Electron bridge unavailable');

  const response = await fetch(url);
  if (!response.ok) throw new DownloadError(`Download failed: HTTP ${response.status}`);

  const buffer = await response.arrayBuffer();
  options.onProgress?.({ received: buffer.byteLength, total: buffer.byteLength, percent: 100 });

  let targetPath = options.filename;
  if (options.directory) {
    targetPath = `${options.directory.replace(/\/+$/, '')}/${options.filename}`;
  }
  targetPath = targetPath.replace(/\\/g, '/');
  // Strip any traversal segments so files never escape the download
  // directory; the main process resolves relative paths against it.
  const isAbsolute = targetPath.startsWith('/') || /^[a-zA-Z]:\//.test(targetPath);
  const cleaned = targetPath.split('/').filter((part) => part && part !== '..').join('/');
  const result = await bridge.saveFile({
    path: isAbsolute ? `/${cleaned.replace(/^\/+/, '')}` : cleaned,
    data: buffer,
  });
  if (!result.ok) {
    throw new DownloadError(result.error || 'Failed to save file');
  }
}

/* ---------- Public API ---------- */

/**
 * Save a remote file to the device:
 * - web: fetch + StreamSaver (service worker streaming), blob fallback
 * - Android: Capacitor Filesystem under Documents (subfolder)
 * - desktop: Electron IPC writing through native fs
 */
export async function saveDownload(url: string, options: DownloadOptions): Promise<void> {
  if (isCapacitor()) {
    await saveWithCapacitor(url, options);
    return;
  }
  if (isElectron()) {
    await saveWithElectron(url, options);
    return;
  }
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    await saveWithStreamSaver(url, options);
    return;
  }
  await saveWithBlob(url, options);
}
