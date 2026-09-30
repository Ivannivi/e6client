import axios, { AxiosError } from 'axios';
import type { Settings } from '../types';
import { getActiveAccount } from '../types';
import { APP_CONFIG } from '../config';

const http = axios.create({
  timeout: APP_CONFIG.api.timeout,
});

/**
 * Browser settings do not contain a way to establish ownership of a proxy.
 * Keep this allowlist empty until a platform-owned proxy has an auditable trust
 * boundary; user-entered proxy URLs are always untrusted.
 */
const trustedProxyOrigins = new Set<string>();

export type ApiTransport = 'direct' | 'trusted-proxy' | 'untrusted-proxy';
export type RequestAuthentication = 'optional' | 'required';

export interface ApiRequestOptions {
  authentication?: RequestAuthentication;
  retries?: number;
}

/** Raised before a credential can be put into an untrusted proxy request. */
export class ProxyAuthenticationError extends Error {
  constructor() {
    super('Authenticated requests require a direct or trusted connection. Disable the proxy or use an anonymous action.');
    this.name = 'ProxyAuthenticationError';
  }
}

function classifyTransport(settings: Settings): ApiTransport {
  if (!settings.enableProxy || !settings.proxyUrl) return 'direct';

  try {
    return trustedProxyOrigins.has(new URL(settings.proxyUrl).origin)
      ? 'trusted-proxy'
      : 'untrusted-proxy';
  } catch {
    // An invalid configured proxy must never be treated as trusted.
    return 'untrusted-proxy';
  }
}

export function buildApiUrl(
  endpoint: string,
  params: Record<string, string>,
  settings: Settings,
  authentication: RequestAuthentication = 'optional',
): string {
  const activeAccount = getActiveAccount(settings);
  const baseUrl = activeAccount?.hostUrl || APP_CONFIG.api.baseUrl;
  const transport = classifyTransport(settings);
  const hasCredentials = Boolean(activeAccount?.username?.trim() && activeAccount.apiKey?.trim());

  if (authentication === 'required' && transport === 'untrusted-proxy') {
    throw new ProxyAuthenticationError();
  }

  const searchParams: Record<string, string> = {
    ...params,
    _cb: Date.now().toString(),
  };

  // Public reads may use an untrusted proxy anonymously. Credentials are only
  // attached when the final transport is direct or explicitly allowlisted.
  if (hasCredentials && transport !== 'untrusted-proxy') {
    searchParams.login = activeAccount.username.trim();
    searchParams.api_key = activeAccount.apiKey.trim();
  }

  const targetUrl = new URL(`${baseUrl}${endpoint}`);
  Object.entries(searchParams).forEach(([k, v]) => targetUrl.searchParams.append(k, v));
  const targetString = targetUrl.toString();

  if (transport === 'direct') {
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
  if (error instanceof ProxyAuthenticationError) {
    return error.message;
  }
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

/**
 * Typed request layer shared by the domain services. Handles host selection,
 * credential attachment, proxy safety, and retry policy in one place.
 */
export const client = {
  async get<T>(
    endpoint: string,
    params: Record<string, string>,
    settings: Settings,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const url = buildApiUrl(endpoint, params, settings, options.authentication ?? 'optional');
    return fetchWithRetry(async () => {
      const res = await http.get<T>(url);
      return res.data;
    }, options.retries ?? APP_CONFIG.api.maxRetries);
  },
};
