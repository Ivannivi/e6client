import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { api, parseApiError } from './api';
import { makeSettings, makeAccount, makeRawPost, makeUser, makeComment, makeTagSuggestion } from '../test/factories';

const { httpGet } = vi.hoisted(() => ({ httpGet: vi.fn() }));

vi.mock('axios', () => ({
  default: {
    create: () => ({ get: httpGet }),
    isAxiosError: (err: unknown) => err !== null && typeof err === 'object' && (err as { isAxiosError?: boolean }).isAxiosError === true,
  },
  isAxiosError: (err: unknown) => err !== null && typeof err === 'object' && (err as { isAxiosError?: boolean }).isAxiosError === true,
}));

function makeAxiosResponse<T>(data: T, status = 200, statusText = 'OK'): AxiosResponse<T> {
  return {
    data,
    status,
    statusText,
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

function makeAxiosError(
  status?: number,
  statusText = 'Error',
  requestData: unknown = {},
): AxiosError {
  const config = {} as InternalAxiosRequestConfig;
  if (status !== undefined) {
    return {
      config,
      response: makeAxiosResponse(requestData, status, statusText),
      isAxiosError: true,
      name: 'AxiosError',
      message: `Request failed with status code ${status}`,
      toJSON: () => ({}),
    } as AxiosError;
  }
  return {
    config,
    request: requestData,
    isAxiosError: true,
    name: 'AxiosError',
    message: 'Network Error',
    toJSON: () => ({}),
  } as AxiosError;
}

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

describe('api.getPosts', () => {
  it('maps raw v2 posts into the legacy Post shape', async () => {
    const raw = makeRawPost();
    httpGet.mockResolvedValue(makeAxiosResponse([raw]));

    const posts = await api.getPosts(makeSettings(), 'fox', 1, 20);

    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe(raw.id);
    expect(posts[0].file.ext).toBe('png');
    expect(posts[0].score.total).toBe(3963);
  });

  it('returns an empty array when the api returns no posts', async () => {
    httpGet.mockResolvedValue(makeAxiosResponse([]));
    const posts = await api.getPosts(makeSettings());
    expect(posts).toEqual([]);
  });

  it('retries on 5xx errors and eventually succeeds', async () => {
    const raw = makeRawPost();
    httpGet
      .mockRejectedValueOnce(makeAxiosError(503, 'Service Unavailable'))
      .mockRejectedValueOnce(makeAxiosError(500, 'Internal Server Error'))
      .mockResolvedValueOnce(makeAxiosResponse([raw]));

    const posts = await api.getPosts(makeSettings());
    expect(posts).toHaveLength(1);
    expect(httpGet).toHaveBeenCalledTimes(3);
  }, 15000);

  it('throws immediately on 4xx errors without retrying', async () => {
    httpGet.mockRejectedValue(makeAxiosError(401, 'Unauthorized'));
    await expect(api.getPosts(makeSettings())).rejects.toBeDefined();
    expect(httpGet).toHaveBeenCalledTimes(1);
  });
});

describe('api.searchTags', () => {
  it('returns tag suggestions on success', async () => {
    const tag = makeTagSuggestion({ name: 'fox' });
    httpGet.mockResolvedValue(makeAxiosResponse([tag]));
    const result = await api.searchTags(makeSettings(), 'fo');
    expect(result).toEqual([tag]);
  });

  it('returns an empty array on error', async () => {
    httpGet.mockRejectedValue(makeAxiosError(500));
    const result = await api.searchTags(makeSettings(), 'fo');
    expect(result).toEqual([]);
  });
});

describe('api.getComments', () => {
  it('returns comments from the comments wrapper', async () => {
    const comment = makeComment();
    httpGet.mockResolvedValue(makeAxiosResponse({ comments: [comment] }));
    const result = await api.getComments(makeSettings(), 1);
    expect(result).toEqual([comment]);
  });

  it('returns the raw array when there is no comments wrapper', async () => {
    const comments = [makeComment(), makeComment({ id: 2 })];
    httpGet.mockResolvedValue(makeAxiosResponse(comments));
    const result = await api.getComments(makeSettings(), 1);
    expect(result).toHaveLength(2);
  });

  it('returns an empty array on error', async () => {
    httpGet.mockRejectedValue(makeAxiosError(404));
    const result = await api.getComments(makeSettings(), 1);
    expect(result).toEqual([]);
  });
});

describe('api.getUser', () => {
  it('returns the user object from the user wrapper', async () => {
    const user = makeUser();
    httpGet.mockResolvedValue(makeAxiosResponse({ user }));
    const result = await api.getUser(makeSettings(), 1);
    expect(result).toEqual(user);
  });

  it('returns the raw data when there is no user wrapper', async () => {
    const user = makeUser();
    httpGet.mockResolvedValue(makeAxiosResponse(user));
    const result = await api.getUser(makeSettings(), 1);
    expect(result).toEqual(user);
  });

  it('returns null on error', async () => {
    httpGet.mockRejectedValue(makeAxiosError(404));
    const result = await api.getUser(makeSettings(), 1);
    expect(result).toBeNull();
  });
});

describe('api.getUserByName', () => {
  it('returns the exact name match when present', async () => {
    const exact = makeUser({ name: 'alice' });
    const other = makeUser({ id: 2, name: 'alicia' });
    httpGet.mockResolvedValue(makeAxiosResponse([other, exact]));
    const result = await api.getUserByName(makeSettings(), 'alice');
    expect(result?.name).toBe('alice');
  });

  it('falls back to the first user when no exact match', async () => {
    const users = [makeUser({ name: 'bob' })];
    httpGet.mockResolvedValue(makeAxiosResponse(users));
    const result = await api.getUserByName(makeSettings(), 'bobby');
    expect(result?.name).toBe('bob');
  });

  it('returns null when no users are found', async () => {
    httpGet.mockResolvedValue(makeAxiosResponse([]));
    const result = await api.getUserByName(makeSettings(), 'nobody');
    expect(result).toBeNull();
  });

  it('returns null on error', async () => {
    httpGet.mockRejectedValue(makeAxiosError(500));
    const result = await api.getUserByName(makeSettings(), 'nobody');
    expect(result).toBeNull();
  });
});

describe('api.getUsersByIds', () => {
  it('returns an empty array without making a request when no ids are given', async () => {
    const result = await api.getUsersByIds(makeSettings(), []);
    expect(result).toEqual([]);
    expect(httpGet).not.toHaveBeenCalled();
  });

  it('returns users on success', async () => {
    const users = [makeUser(), makeUser({ id: 2 })];
    httpGet.mockResolvedValue(makeAxiosResponse(users));
    const result = await api.getUsersByIds(makeSettings(), [1, 2]);
    expect(result).toHaveLength(2);
  });

  it('returns an empty array on error', async () => {
    httpGet.mockRejectedValue(makeAxiosError(500));
    const result = await api.getUsersByIds(makeSettings(), [1]);
    expect(result).toEqual([]);
  });
});

describe('api url building (via getPosts)', () => {
  it('appends login credentials when an account is active', async () => {
    httpGet.mockResolvedValue(makeAxiosResponse([]));
    const account = makeAccount({ username: 'alice', apiKey: 'secret' });
    const settings = makeSettings({ accounts: [account], activeAccountId: account.id });

    await api.getPosts(settings);

    const calledUrl = httpGet.mock.calls[0][0] as string;
    expect(calledUrl).toContain('login=alice');
    expect(calledUrl).toContain('api_key=secret');
  });

  it('uses the account host url when set', async () => {
    httpGet.mockResolvedValue(makeAxiosResponse([]));
    const account = makeAccount({ hostUrl: 'https://e926.net' });
    const settings = makeSettings({ accounts: [account], activeAccountId: account.id });

    await api.getPosts(settings);

    const calledUrl = httpGet.mock.calls[0][0] as string;
    expect(calledUrl.startsWith('https://e926.net/')).toBe(true);
  });

  it('routes through the proxy when enableProxy is on', async () => {
    httpGet.mockResolvedValue(makeAxiosResponse([]));
    const settings = makeSettings({
      enableProxy: true,
      proxyUrl: 'https://corsproxy.io/?',
    });

    await api.getPosts(settings);

    const calledUrl = httpGet.mock.calls[0][0] as string;
    expect(calledUrl.startsWith('https://corsproxy.io/?')).toBe(true);
  });
});
