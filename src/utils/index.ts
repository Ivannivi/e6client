import { Post, Settings, Tags } from '../types';

export function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export function isVideoFile(extension: string): boolean {
  return ['webm', 'mp4'].includes(extension.toLowerCase());
}

export function isAnimatedFile(extension: string): boolean {
  return ['webm', 'mp4', 'gif'].includes(extension.toLowerCase());
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
