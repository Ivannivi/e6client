import axios, { AxiosError } from 'axios';
import type { Settings, Post, Comment, User, TagSuggestion, Score, Tags, PostFlags, Rating } from '../types';
import { getActiveAccount } from '../types';
import { APP_CONFIG } from '../config';

export interface RawPostV2 {
  id: number;
  created_at: string;
  updated_at: string;
  change_seq: number;
  files: {
    meta: { md5: string; ext: string; size: number; duration: number | null; has_sample: boolean };
    original: { width: number; height: number; url: string | null };
    preview: { width: number; height: number; jpg: string | null; webp: string | null };
    sample: { width: number; height: number; jpg: string | null; webp: string | null };
  };
  uploader_id: number;
  uploader_name: string;
  approver_id: number | null;
  stats: {
    score: Score;
    fav_count: number;
    is_favorited: boolean;
    comment_count: number;
  };
  flags: PostFlags;
  has: {
    parent: boolean;
    children: boolean;
    active_children: boolean;
    notes: boolean;
    sample: boolean;
  };
  relationships: { parent_id: number | null; children: number[] };
  pools: number[];
  rating: Rating;
  locked_tags: string[];
  sources: string[];
  description: string;
  tags: Tags;
}

export function mapV2Post(raw: RawPostV2): Post {
  return {
    id: raw.id,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    change_seq: raw.change_seq,
    file: {
      width: raw.files.original.width,
      height: raw.files.original.height,
      ext: raw.files.meta.ext,
      size: raw.files.meta.size,
      md5: raw.files.meta.md5,
      url: raw.files.original.url,
    },
    preview: {
      width: raw.files.preview.width,
      height: raw.files.preview.height,
      url: raw.files.preview.jpg ?? raw.files.preview.webp,
    },
    sample: {
      has: raw.has.sample,
      width: raw.files.sample.width,
      height: raw.files.sample.height,
      url: raw.files.sample.jpg ?? raw.files.sample.webp,
      alternates: {},
    },
    score: raw.stats.score,
    tags: raw.tags,
    locked_tags: raw.locked_tags,
    flags: raw.flags,
    rating: raw.rating,
    fav_count: raw.stats.fav_count,
    sources: raw.sources,
    pools: raw.pools,
    relationships: {
      parent_id: raw.relationships.parent_id,
      has_children: raw.has.children,
      has_active_children: raw.has.active_children,
      children: raw.relationships.children,
    },
    approver_id: raw.approver_id,
    uploader_id: raw.uploader_id,
    description: raw.description,
    comment_count: raw.stats.comment_count,
    is_favorited: raw.stats.is_favorited,
    has_notes: raw.has.notes,
    duration: raw.files.meta.duration,
  };
}

const http = axios.create({
  timeout: APP_CONFIG.api.timeout,
});

function buildApiUrl(
  endpoint: string,
  params: Record<string, string>,
  settings: Settings
): string {
  const activeAccount = getActiveAccount(settings);
  const baseUrl = activeAccount?.hostUrl || APP_CONFIG.api.baseUrl;
  
  const searchParams: Record<string, string> = {
    ...params,
    _cb: Date.now().toString(),
  };

  if (activeAccount?.username && activeAccount?.apiKey) {
    searchParams.login = activeAccount.username.trim();
    searchParams.api_key = activeAccount.apiKey.trim();
  }

  const targetUrl = new URL(`${baseUrl}${endpoint}`);
  Object.entries(searchParams).forEach(([k, v]) => targetUrl.searchParams.append(k, v));
  const targetString = targetUrl.toString();

  if (!settings.enableProxy || !settings.proxyUrl) {
    return targetString;
  }

  if (settings.proxyUrl.includes('?')) {
    return `${settings.proxyUrl}${encodeURIComponent(targetString)}`;
  }

  return targetString.replace(baseUrl, settings.proxyUrl.replace(/\/$/, ''));
}

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries: number = APP_CONFIG.api.maxRetries,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;

    const axiosErr = error as AxiosError;
    const status = axiosErr.response?.status;
    const shouldRetry = !status || status >= 500;

    if (!shouldRetry) throw error;

    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(fn, retries - 1, delay * 2);
  }
}

export function parseApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const status = error.response.status;
      if (status === 401 || status === 403) {
        return `Authentication failed (${status}). Check your API credentials.`;
      }
      return `Server error: ${status} ${error.response.statusText}`;
    }
    if (error.request) {
      return 'Network error. Check your connection or try enabling the proxy.';
    }
    return error.message;
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}

export const api = {
  async getPosts(
    settings: Settings,
    tags = '',
    page = 1,
    limit: number = APP_CONFIG.api.defaultPageSize
  ): Promise<Post[]> {
    const url = buildApiUrl('/posts.json', {
      tags,
      page: String(page),
      limit: String(limit),
      v2: 'true',
      mode: 'extended',
    }, settings);

    return fetchWithRetry(async () => {
      const res = await http.get<RawPostV2[]>(url);
      return res.data.map(mapV2Post);
    });
  },

  async searchTags(settings: Settings, query: string): Promise<TagSuggestion[]> {
    const url = buildApiUrl('/tags/autocomplete.json', {
      'search[name_matches]': query,
      expiry: '7',
    }, settings);

    try {
      const res = await http.get(url);
      return res.data;
    } catch {
      return [];
    }
  },

  async getComments(settings: Settings, postId: number): Promise<Comment[]> {
    const url = buildApiUrl('/comments.json', {
      'search[post_id]': String(postId),
      group_by: 'comment',
      limit: '30',
    }, settings);

    try {
      const res = await http.get(url);
      return res.data.comments || res.data || [];
    } catch {
      return [];
    }
  },

  async getUser(settings: Settings, userId: number): Promise<User | null> {
    const url = buildApiUrl(`/users/${userId}.json`, {}, settings);

    try {
      const res = await http.get(url);
      return res.data.user || res.data;
    } catch {
      return null;
    }
  },

  async getUserByName(settings: Settings, username: string): Promise<User | null> {
    const url = buildApiUrl('/users.json', {
      'search[name_matches]': username,
    }, settings);

    try {
      const res = await http.get(url);
      const users = Array.isArray(res.data) ? res.data : res.data.users || [];
      if (users.length === 0) return null;

      const exact = users.find(
        (u: User) => u.name.toLowerCase() === username.toLowerCase()
      );
      return exact || users[0];
    } catch {
      return null;
    }
  },

  async getUsersByIds(settings: Settings, userIds: number[]): Promise<User[]> {
    if (userIds.length === 0) return [];

    const url = buildApiUrl('/users.json', {
      'search[id]': userIds.join(','),
    }, settings);

    try {
      const res = await http.get(url);
      return Array.isArray(res.data) ? res.data : res.data.users || [];
    } catch {
      return [];
    }
  },
};