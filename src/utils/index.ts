import { Post, Settings, Tags } from '../types';

export function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

export function isVideoFile(extension: string): boolean {
  return ['webm', 'mp4'].includes(extension.toLowerCase());
}

export function isAnimatedFile(extension: string): boolean {
  return ['webm', 'mp4', 'gif'].includes(extension.toLowerCase());
}

export function isSvgFile(extension: string): boolean {
  return extension.toLowerCase() === 'svg';
}

export function getAspectRatio(width: number, height: number): string {
  return width && height ? `${width} / ${height}` : 'auto';
}

export function isPostBlacklisted(post: Post, blacklist: string[]): boolean {
  if (blacklist.length === 0) return false;
  
  const allTags = [
    ...post.tags.general,
    ...post.tags.species,
    ...post.tags.character,
    ...post.tags.artist,
  ];
  
  return allTags.some((tag) => blacklist.includes(tag));
}

export function buildSearchQuery(
  baseQuery: string,
  options: {
    tab: 'home' | 'favorites';
    username?: string;
    nsfwEnabled: boolean;
  }
): string {
  const parts: string[] = [];

  if (options.tab === 'favorites' && options.username) {
    parts.push(`fav:${options.username}`);
  }

  if (!options.nsfwEnabled) {
    parts.push('rating:s');
  }

  if (baseQuery.trim()) {
    parts.push(baseQuery.trim());
  }

  return parts.join(' ');
}

export function distributeToColumns<T>(items: T[], columnCount: number): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  
  items.forEach((item, index) => {
    columns[index % columnCount].push(item);
  });

  return columns;
}

export function getLastSearchTerm(query: string): string {
  const terms = query.trim().split(' ');
  return terms[terms.length - 1] || '';
}

export function replaceLastSearchTerm(query: string, newTerm: string): string {
  const terms = query.trim().split(' ');
  terms.pop();
  terms.push(newTerm);
  return terms.join(' ') + ' ';
}

export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string | null;
      if (!result) {
        reject(new Error('Failed to read blob as data URL'));
        return;
      }
      const base64 = result.split(',')[1];
      resolve(base64 ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function tryNativeDownload(blob: Blob, filename: string): Promise<boolean> {
  if (!window.Capacitor) return false;

  const { Filesystem } = window.Capacitor.Plugins;
  if (!Filesystem) return false;

  try {
    const base64 = await blobToBase64(blob);
    const platform = window.Capacitor.getPlatform?.() ?? 'web';
    const folder = `e6client/${platform === 'ios' ? 'Downloads' : ''}`;
    const path = folder ? `${folder}/${filename}` : filename;

    // Prefer shared storage on Android; fall back to Documents if unavailable.
    const directories = platform === 'android'
      ? ['EXTERNAL_STORAGE', 'DOCUMENTS']
      : ['DOCUMENTS'];

    for (const directory of directories) {
      try {
        await Filesystem.writeFile({
          path,
          data: base64,
          directory: directory as never,
          recursive: true,
        });
        return true;
      } catch {
        // Try the next directory.
      }
    }

    return false;
  } catch {
    return false;
  }
}

function webDownload(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

/**
 * Download a file from a URL.
 * On native platforms the file is saved to device storage via Capacitor
 * Filesystem when available; on web it falls back to a blob download.
 */
export async function downloadFile(
  url: string,
  filename: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');
  } catch {
    window.open(url, '_blank');
    throw new Error('Download failed');
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Unable to read response');

  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    received += value.length;

    if (total && onProgress) {
      onProgress(Math.round((received / total) * 100));
    }
  }

  const blob = new Blob(chunks);

  const savedNatively = await tryNativeDownload(blob, filename);
  if (!savedNatively) {
    webDownload(blob, filename);
  }
}

/**
 * Share content using the best available native/web API.
 * Tries Capacitor Share, then Web Share API, then clipboard.
 */
export async function shareContent(data: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> {
  // Try Capacitor Share on native platforms first.
  if (window.Capacitor?.Plugins?.Share) {
    try {
      await window.Capacitor.Plugins.Share.share(data);
      return true;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return false; // User cancelled
      }
      // Fall through to web APIs on error.
    }
  }

  // Try Web Share API next.
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return false; // User cancelled
      }
    }
  }

  // Fallback to clipboard.
  const shareText = data.url || data.text || '';
  if (shareText && navigator.clipboard) {
    await navigator.clipboard.writeText(shareText);
    return true;
  }

  return false;
}

/**
 * Open a URL in the platform's in-app browser when running natively,
 * otherwise open in a new browser tab.
 */
export async function openInAppBrowser(url: string): Promise<void> {
  if (window.Capacitor?.Plugins?.Browser) {
    try {
      await window.Capacitor.Plugins.Browser.open({ url });
      return;
    } catch {
      // Fall back to a regular tab open.
    }
  }

  window.open(url, '_blank');
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}

/**
 * Generate a filename for a post download
 */
export function generatePostFilename(post: Post): string {
  const artists = post.tags.artist.slice(0, 2).join('_') || 'unknown';
  const sanitized = artists.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `e6_${post.id}_${sanitized}.${post.file.ext}`;
}

