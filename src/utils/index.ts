import { Post, Settings, Tags, isSafeProvider } from '../types';

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
  return ['svg', 'svgz'].includes(extension.toLowerCase());
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
    hostUrl: string;
  }
): string {
  const parts: string[] = [];

  if (options.tab === 'favorites' && options.username) {
    parts.push(`fav:${options.username}`);
  }

  if (isSafeProvider(options.hostUrl)) {
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

/**
 * Share content using Web Share API or fallback to clipboard
 */
export async function shareContent(data: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> {
  // Try Web Share API first
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

  // Fallback to clipboard
  const shareText = data.url || data.text || '';
  if (shareText && navigator.clipboard) {
    await navigator.clipboard.writeText(shareText);
    return true;
  }

  return false;
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

