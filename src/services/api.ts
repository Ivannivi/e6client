import axios, { AxiosError } from 'axios';
import type { Settings, Post, Comment, User, TagSuggestion } from '../types';
import { APP_CONFIG } from '../config';

const http = axios.create({
  timeout: APP_CONFIG.api.timeout,
});

function buildApiUrl(
  endpoint: string,
  params: Record<string, string>,
  settings: Settings
): string {
  const searchParams: Record<string, string> = {
    ...params,
    _cb: Date.now().toString(),
  };

  if (settings.username && settings.apiKey) {
    searchParams.login = settings.username.trim();
    searchParams.api_key = settings.apiKey.trim();
  }

  const targetUrl = new URL(`${APP_CONFIG.api.baseUrl}${endpoint}`);
  Object.entries(searchParams).forEach(([k, v]) => targetUrl.searchParams.append(k, v));
  const targetString = targetUrl.toString();

  if (!settings.enableProxy || !settings.proxyUrl) {
    return targetString;
  }

  if (settings.proxyUrl.includes('?')) {
    return `${settings.proxyUrl}${encodeURIComponent(targetString)}`;
  }

  return targetString.replace(APP_CONFIG.api.baseUrl, settings.proxyUrl.replace(/\/$/, ''));
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
    limit = APP_CONFIG.api.defaultPageSize
  ): Promise<Post[]> {
    const url = buildApiUrl('/posts.json', {
      tags,
      page: String(page),
      limit: String(limit),
    }, settings);

    return fetchWithRetry(async () => {
      const res = await http.get(url);
      return res.data.posts;
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