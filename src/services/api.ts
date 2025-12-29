import axios from 'axios';
import { AppSettings, Comment, User } from '../types';

// Configure a default axios instance
const client = axios.create({
  timeout: 15000, // 15 seconds timeout
});

export class ApiService {
  private static getHeaders(settings: AppSettings): Record<string, string> {
    // RETURN EMPTY HEADERS
    // Removing 'Content-Type: application/json' is critical. 
    // Including it makes the request "non-simple" (CORS), triggering a Preflight (OPTIONS) request.
    // e621 or the Proxy often fails the OPTIONS request, resulting in "Network Error".
    // GET requests generally do not need a Content-Type.
    return {};
  }

  // Helper to construct the final URL based on proxy settings
  private static buildUrl(endpoint: string, params: Record<string, string>, settings: AppSettings): string {
    // Add cache buster to prevent browser/proxy caching issues
    const safeParams = { ...params, _cb: Date.now().toString() };

    // AUTHENTICATION: Use Query Parameters instead of Headers
    // This is more reliable for client-side apps using proxies.
    if (settings.username && settings.apiKey) {
        safeParams['login'] = settings.username.trim();
        safeParams['api_key'] = settings.apiKey.trim();
    }

    // 1. Construct the canonical e621 URL with params
    const targetUrl = new URL(`https://e621.net${endpoint}`);
    Object.entries(safeParams).forEach(([key, value]) => {
      targetUrl.searchParams.append(key, value);
    });

    const targetUrlString = targetUrl.toString();

    // 2. Apply Proxy Logic
    if (settings.enableProxy && settings.proxyUrl) {
      // Check if it's a "Prefix" proxy (e.g. https://corsproxy.io/?url=)
      if (settings.proxyUrl.includes('?')) {
        return `${settings.proxyUrl}${encodeURIComponent(targetUrlString)}`;
      } 
      
      // Assume "Host Replacement" proxy (e.g. http://localhost:8080)
      const proxyBase = settings.proxyUrl.replace(/\/$/, '');
      return targetUrlString.replace('https://e621.net', proxyBase);
    }

    return targetUrlString;
  }

  // Generic retry wrapper
  private static async fetchWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (retries <= 0) throw error;
      
      // Retry on network errors or 5xx server errors
      const shouldRetry = !error.response || (error.response.status >= 500 && error.response.status < 600);
      
      if (shouldRetry) {
        console.warn(`Request failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(fn, retries - 1, delay * 2);
      }
      
      throw error;
    }
  }

  static async getPosts(settings: AppSettings, tags: string = '', page: number = 1, limit: number = 20) {
    const url = this.buildUrl('/posts.json', {
      tags,
      page: page.toString(),
      limit: limit.toString()
    }, settings);

    return this.fetchWithRetry(async () => {
        const response = await client.get(url, {
            headers: this.getHeaders(settings)
        });
        return response.data.posts;
    });
  }

  static async getTags(settings: AppSettings, query: string) {
    const url = this.buildUrl('/tags/autocomplete.json', {
      'search[name_matches]': query,
      expiry: '7'
    }, settings);

    try {
        const response = await client.get(url, {
            headers: this.getHeaders(settings)
        });
        return response.data;
    } catch (e) {
        return [];
    }
  }

  static async getComments(settings: AppSettings, postId: number): Promise<Comment[]> {
    const url = this.buildUrl('/comments.json', {
      'search[post_id]': postId.toString(),
      'group_by': 'comment', // Standardizes output
      limit: '30'
    }, settings);

    try {
        const response = await client.get(url, { headers: this.getHeaders(settings) });
        // The API might return { comments: [...] } or just [...]
        return response.data.comments || response.data || [];
    } catch (e) {
        console.error('Failed to fetch comments', e);
        return [];
    }
  }

  static async getUserProfile(settings: AppSettings, username: string): Promise<User | null> {
    // Use search[name_matches] for exact/pattern match. 
    // search[name] is often legacy or strict.
    const url = this.buildUrl('/users.json', {
      'search[name_matches]': username
    }, settings);
    
    try {
        const response = await client.get(url, { headers: this.getHeaders(settings) });
        // Handle namespaced response { users: [...] } or direct array [...]
        const data = response.data;
        const users = Array.isArray(data) ? data : (data.users || []);
        
        if (users.length > 0) {
            // If multiple results (fuzzy match), try to find exact case-insensitive match
            const exact = users.find((u: any) => u.name.toLowerCase() === username.toLowerCase());
            return exact || users[0];
        }
        return null;
    } catch (e) {
        console.error('Failed to fetch user', e);
        throw e;
    }
  }

  static async getUserById(settings: AppSettings, userId: number): Promise<User | null> {
    const url = this.buildUrl(`/users/${userId}.json`, {}, settings);
    try {
         const response = await client.get(url, { headers: this.getHeaders(settings) });
         // Endpoint /users/ID.json returns the user object directly or { user: ... }
         return response.data.user || response.data;
    } catch (e) {
        return null;
    }
  }

  static async getUsersByIds(settings: AppSettings, userIds: number[]): Promise<User[]> {
    if (userIds.length === 0) return [];
    
    // e621 allows comma separated IDs in search[id]
    const url = this.buildUrl('/users.json', {
        'search[id]': userIds.join(',')
    }, settings);

    try {
        const response = await client.get(url, { headers: this.getHeaders(settings) });
        const data = response.data;
        return Array.isArray(data) ? data : (data.users || []);
    } catch (e) {
        console.error('Failed to batch fetch users', e);
        return [];
    }
  }
}