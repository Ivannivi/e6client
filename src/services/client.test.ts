import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { client, buildApiUrl, parseApiError, ProxyAuthenticationError } from './client';
import { makeSettings, makeAccount, makeRawPost } from '../test/factories';
import { makeAxiosResponse, makeAxiosError } from '../test/axios';

const { httpGet } = vi.hoisted(() => ({ httpGet: vi.fn() }));

vi.mock('axios', () => ({
  default: {
    create: () => ({ get: httpGet }),
    isAxiosError: (err: unknown) => err !== null && typeof err === 'object' && (err as { isAxiosError?: boolean }).isAxiosError === true,
  },
  isAxiosError: (err: unknown) => err !== null && typeof err === 'object' && (err as { isAxiosError?: boolean }).isAxiosError === true,
}));

beforeEach(() => {
  httpGet.mockReset();
});

describe('parseApiError', () => {
  it('reports authentication failed for 401', () => {
    const err = makeAxiosError(401, 'Unauthorized');
    expect(parseApiError(err)).toContain('Authentication failed');
    expect(parseApiError(err)).toContain('401');
  });

  it('reports authentication failed for 403', () => {
    const err = makeAxiosError(403, 'Forbidden');
    expect(parseApiError(err)).toContain('403');
  });

  it('reports server error with status for other response codes', () => {
    const err = makeAxiosError(500, 'Internal Server Error');
    expect(parseApiError(err)).toBe('Server error: 500 Internal Server Error');
  });

  it('reports network error when there is no response', () => {
    const err = makeAxiosError(undefined);
    expect(parseApiError(err)).toBe('Network error. Check your connection or try enabling the proxy.');
  });

  it('falls back to error.message for axios errors without response or request', () => {
    const err = {
      isAxiosError: true,
      name: 'AxiosError',
      message: 'something broke',
      config: {} as InternalAxiosRequestConfig,
      toJSON: () => ({}),
    } as AxiosError;
    expect(parseApiError(err)).toBe('something broke');
  });

  it('handles plain Error instances', () => {
    expect(parseApiError(new Error('boom'))).toBe('boom');
  });

  it('handles unknown error types', () => {
    expect(parseApiError('just a string')).toBe('An unexpected error occurred');
    expect(parseApiError(null)).toBe('An unexpected error occurred');
    expect(parseApiError(undefined)).toBe('An unexpected error occurred');
  });
});

describe('client.get', () => {
  it('resolves with the response body', async () => {
    const raw = makeRawPost();
    httpGet.mockResolvedValue(makeAxiosResponse([raw]));

    const data = await client.get('/posts.json', {}, makeSettings());
    expect(data).toEqual([raw]);
  });

  it('passes params through to the request url', async () => {
    httpGet.mockResolvedValue(makeAxiosResponse([]));

    await client.get('/posts.json', { tags: 'fox', page: '2' }, makeSettings());

    const calledUrl = httpGet.mock.calls[0][0] as string;
    expect(calledUrl).toContain('tags=fox');
    expect(calledUrl).toContain('page=2');
  });

  it('retries on 5xx errors and eventually succeeds', async () => {
    const raw = makeRawPost();
    httpGet
      .mockRejectedValueOnce(makeAxiosError(503, 'Service Unavailable'))
      .mockRejectedValueOnce(makeAxiosError(500, 'Internal Server Error'))
      .mockResolvedValueOnce(makeAxiosResponse([raw]));

    const data = await client.get('/posts.json', {}, makeSettings());
    expect(data).toEqual([raw]);
    expect(httpGet).toHaveBeenCalledTimes(3);
  }, 15000);

  it('throws immediately on 4xx errors without retrying', async () => {
    httpGet.mockRejectedValue(makeAxiosError(401, 'Unauthorized'));
    await expect(client.get('/posts.json', {}, makeSettings())).rejects.toBeDefined();
    expect(httpGet).toHaveBeenCalledTimes(1);
  });

  it('does not retry when retries is 0', async () => {
    httpGet.mockRejectedValue(makeAxiosError(500, 'Internal Server Error'));
    await expect(
      client.get('/comments.json', {}, makeSettings(), { retries: 0 })
    ).rejects.toBeDefined();
    expect(httpGet).toHaveBeenCalledTimes(1);
  });
});

describe('request url building', () => {
  it('appends login credentials when an account is active', async () => {
    httpGet.mockResolvedValue(makeAxiosResponse([]));
    const account = makeAccount({ username: 'alice', apiKey: 'secret' });
    const settings = makeSettings({ accounts: [account], activeAccountId: account.id });

    await client.get('/posts.json', {}, settings);

    const calledUrl = httpGet.mock.calls[0][0] as string;
    expect(calledUrl).toContain('login=alice');
    expect(calledUrl).toContain('api_key=secret');
  });

  it('uses the account host url when set', async () => {
    httpGet.mockResolvedValue(makeAxiosResponse([]));
    const account = makeAccount({ hostUrl: 'https://e926.net' });
    const settings = makeSettings({ accounts: [account], activeAccountId: account.id });

    await client.get('/posts.json', {}, settings);

    const calledUrl = httpGet.mock.calls[0][0] as string;
    expect(calledUrl.startsWith('https://e926.net/')).toBe(true);
  });

  it('routes through the proxy when enableProxy is on', async () => {
    httpGet.mockResolvedValue(makeAxiosResponse([]));
    const settings = makeSettings({
      enableProxy: true,
      proxyUrl: 'https://corsproxy.io/?',
    });

    await client.get('/posts.json', {}, settings);

    const calledUrl = httpGet.mock.calls[0][0] as string;
    expect(calledUrl.startsWith('https://corsproxy.io/?')).toBe(true);
  });

  it.each([
    ['query-style proxy', 'https://corsproxy.io/?'],
    ['base-url replacement proxy', 'https://proxy.example.test'],
  ])('never sends credentials through a %s', async (_, proxyUrl) => {
    httpGet.mockResolvedValue(makeAxiosResponse([]));
    const account = makeAccount({ username: 'alice', apiKey: 'secret-key' });
    const settings = makeSettings({
      accounts: [account],
      activeAccountId: account.id,
      enableProxy: true,
      proxyUrl,
    });

    await client.get('/posts.json', {}, settings);

    const calledUrl = decodeURIComponent(httpGet.mock.calls[0][0] as string);
    expect(calledUrl).not.toContain('login=alice');
    expect(calledUrl).not.toContain('api_key=secret-key');
  });

  it('fails an authenticated request before constructing an untrusted proxy URL', () => {
    const account = makeAccount({ username: 'alice', apiKey: 'secret-key' });
    const settings = makeSettings({
      accounts: [account],
      activeAccountId: account.id,
      enableProxy: true,
      proxyUrl: 'https://corsproxy.io/?',
    });

    expect(() => buildApiUrl('/favorites.json', {}, settings, 'required'))
      .toThrow(ProxyAuthenticationError);
    expect(() => buildApiUrl('/favorites.json', {}, settings, 'required'))
      .toThrow('Authenticated requests require a direct or trusted connection');
  });

  it('fails an authenticated request through an untrusted proxy even without saved credentials', () => {
    const settings = makeSettings({
      enableProxy: true,
      proxyUrl: 'https://corsproxy.io/?',
    });

    expect(() => buildApiUrl('/favorites.json', {}, settings, 'required'))
      .toThrow(ProxyAuthenticationError);
  });
});

describe('proxy authentication errors', () => {
  it('provides an actionable error without exposing credentials or proxy URLs', () => {
    const message = parseApiError(new ProxyAuthenticationError());
    expect(message).toContain('Disable the proxy');
    expect(message).not.toContain('secret-key');
    expect(message).not.toContain('corsproxy.io');
  });
});
